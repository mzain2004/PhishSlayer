import { isKnownBad } from './iocStore';
import { createClient } from '../supabase/server';

export async function correlateAlert(alertId: string, orgId: string) {
  const supabase = await createClient();
  
  // 1. Get alert metadata
  const { data: alert } = await supabase
    .from('alerts')
    .select('*')
    .eq('id', alertId)
    .single();
  
  if (!alert || !alert.metadata) return;

  // 2. Extract potential IOCs from metadata
  const indicators = extractIndicators(alert.metadata);
  const matches = [];

  for (const value of indicators) {
    const ioc = await isKnownBad(value);
    if (ioc) {
      matches.push({ value, ioc });
    }
  }

  // 3. Update alert if matches found
  if (matches.length > 0) {
    const tags = matches.map(m => `TIP:${m.ioc.type}:${m.value}`);
    const highestConfidence = Math.max(...matches.map(m => m.ioc.confidence));
    
    let severity = alert.severity;
    if (highestConfidence > 80) severity = 'critical';

    await supabase
      .from('alerts')
      .update({
        severity,
        tags: [...(alert.tags || []), ...tags],
        metadata: { ...alert.metadata, tip_correlation: matches }
      })
      .eq('id', alertId);
  }
}

function extractIndicators(metadata: any): string[] {
  const indicators = new Set<string>();
  if (metadata.source_ip) indicators.add(metadata.source_ip);
  if (metadata.destination_ip) indicators.add(metadata.destination_ip);
  if (metadata.domain) indicators.add(metadata.domain);
  if (metadata.hash) indicators.add(metadata.hash);
  return Array.from(indicators);
}
