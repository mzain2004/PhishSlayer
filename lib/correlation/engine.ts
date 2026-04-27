import { createClient } from '@/lib/supabase/server';
import Groq from 'groq-sdk';

export interface CorrelationRule {
  name: string;
  weight: number;
}

export interface CorrelationResult {
  alertId: string;
  correlationScore: number;
  matchedAlerts: string[];
  incidentId: string | null;
  action: 'grouped' | 'suggested' | 'standalone';
  matchedRules: string[];
}

export async function correlateNewAlert(alertId: string, orgId: string): Promise<CorrelationResult> {
  const supabase = await createClient();
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // 1. Fetch the new alert
  const { data: newAlert, error: fetchError } = await supabase
    .from('alerts')
    .select('*')
    .eq('id', alertId)
    .single();

  if (fetchError || !newAlert) throw new Error(`Alert ${alertId} not found`);

  // 2. Search for related alerts in last 24h
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentAlerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('organization_id', orgId)
    .neq('id', alertId)
    .gt('created_at', twentyFourHoursAgo);

  const matchedAlerts: { id: string; score: number; rules: string[] }[] = [];

  if (recentAlerts) {
    for (const alert of recentAlerts) {
      let score = 0;
      const matchedRules: string[] = [];

      // Rule 1: IP match
      if (newAlert.source_ip && alert.source_ip === newAlert.source_ip && alert.severity !== 'low') {
        score = Math.max(score, 0.9);
        matchedRules.push('IP Match');
      }

      // Rule 2: User match
      if (newAlert.affected_user && alert.affected_user === newAlert.affected_user) {
        const timeDiff = Math.abs(new Date(newAlert.created_at).getTime() - new Date(alert.created_at).getTime());
        if (timeDiff <= 3600000) { // 1h
          score = Math.max(score, 0.85);
          matchedRules.push('User Match');
        }
      }

      // Rule 3: Host match
      if (newAlert.hostname && alert.hostname === newAlert.hostname) {
        const timeDiff = Math.abs(new Date(newAlert.created_at).getTime() - new Date(alert.created_at).getTime());
        if (timeDiff <= 7200000) { // 2h
          score = Math.max(score, 0.8);
          matchedRules.push('Host Match');
        }
      }

      // Rule 4: IOC match
      const newIocs = new Set(newAlert.ioc_values || []);
      const alertIocs = alert.ioc_values || [];
      if (alertIocs.some((ioc: string) => newIocs.has(ioc))) {
        score = Math.max(score, 0.95);
        matchedRules.push('IOC Overlap');
      }

      // Rule 5: MITRE match
      const newMitre = new Set(newAlert.mitre_techniques || []);
      const alertMitre = alert.mitre_techniques || [];
      if (alertMitre.some((tech: string) => newMitre.has(tech))) {
        score = Math.max(score, 0.7);
        matchedRules.push('MITRE Technique Match');
      }

      // Rule 6: Time cluster
      const timeDiff = Math.abs(new Date(newAlert.created_at).getTime() - new Date(alert.created_at).getTime());
      if (timeDiff <= 180000) { // 3min
        score = Math.max(score, 0.5);
        matchedRules.push('Time Cluster');
      }

      if (score > 0) {
        matchedAlerts.push({ id: alert.id, score, rules: matchedRules });
      }
    }
  }

  // 3. Determine best match
  const bestMatch = matchedAlerts.sort((a, b) => b.score - a.score)[0];

  if (!bestMatch) {
    return { alertId, correlationScore: 0, matchedAlerts: [], incidentId: null, action: 'standalone', matchedRules: [] };
  }

  const action = bestMatch.score >= 0.7 ? 'grouped' : (bestMatch.score >= 0.5 ? 'suggested' : 'standalone');
  let incidentId: string | null = null;

  if (action === 'grouped') {
    // Check if the best match is already in an incident
    const { data: existingJunction } = await supabase
      .from('alert_incidents')
      .select('incident_id')
      .eq('alert_id', bestMatch.id)
      .single();

    if (existingJunction) {
      incidentId = existingJunction.incident_id;
      // Add new alert to existing incident
      await supabase.from('alert_incidents').insert({ alert_id: alertId, incident_id: incidentId });
    } else {
      // Create new incident
      incidentId = await buildIncidentFromAlerts([alertId, bestMatch.id], orgId);
    }
  }

  return {
    alertId,
    correlationScore: bestMatch.score,
    matchedAlerts: matchedAlerts.map(a => a.id),
    incidentId,
    action,
    matchedRules: bestMatch.rules
  };
}

export async function buildIncidentFromAlerts(alertIds: string[], orgId: string): Promise<string> {
  const supabase = await createClient();
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // Fetch alert details to generate title
  const { data: alerts } = await supabase.from('alerts').select('*').in('id', alertIds);
  if (!alerts) throw new Error('No alerts found to build incident');

  const maxSeverity = alerts.reduce((max, a) => {
    const sevMap: any = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    return sevMap[a.severity?.toLowerCase()] > sevMap[max] ? a.severity.toLowerCase() : max;
  }, 'info');

  const alertSummary = alerts.map(a => `- ${a.title}: ${a.description}`).join('\n');
  const prompt = `You are a SOC analyst. Summarize these related security alerts into a concise, professional incident title.
  Alerts:
  ${alertSummary}
  
  Respond with ONLY the title. No quotes. No explanation.`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    max_tokens: 50,
  });

  const title = completion.choices[0]?.message?.content?.trim() || `Incident involving ${alerts.length} alerts`;

  const { data: incident, error } = await supabase
    .from('incidents')
    .insert({
      organization_id: orgId,
      title,
      severity: maxSeverity,
      status: 'open',
    })
    .select()
    .single();

  if (error) throw error;

  // Link alerts
  const links = alertIds.map(id => ({ alert_id: id, incident_id: incident.id }));
  await supabase.from('alert_incidents').insert(links);

  return incident.id;
}
