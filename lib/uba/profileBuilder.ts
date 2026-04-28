import { createClient } from '../supabase/server';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export function getRiskLevel(score: number): RiskLevel {
  if (score < 30) return 'LOW';
  if (score < 60) return 'MEDIUM';
  if (score < 80) return 'HIGH';
  return 'CRITICAL';
}

export async function updateRiskProfile(userId: string, orgId: string, result: { riskScore: number, anomalies: any[], triggeredRules: string[] }) {
  const supabase = await createClient();
  const riskLevel = getRiskLevel(result.riskScore);

  const { data, error } = await supabase
    .from('user_risk_profiles')
    .upsert({
      user_id: userId,
      organization_id: orgId,
      risk_score: result.riskScore,
      risk_level: riskLevel,
      anomalies: result.anomalies,
      triggered_rules: result.triggeredRules,
      last_anomaly_at: result.anomalies.length > 0 ? new Date() : null,
      updated_at: new Date()
    }, { onConflict: 'user_id, organization_id' })
    .select()
    .single();

  if (error) {
    console.error('[ProfileBuilder] Error updating risk profile:', error);
    throw error;
  }

  return data;
}

export async function logAnomalyEvent(userId: string, orgId: string, anomaly: any) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('uba_anomaly_events')
    .insert({
      user_id: userId,
      organization_id: orgId,
      anomaly_type: anomaly.type,
      details: anomaly,
      risk_score: anomaly.score
    });

  if (error) {
    console.error('[ProfileBuilder] Error logging anomaly event:', error);
  }
}
