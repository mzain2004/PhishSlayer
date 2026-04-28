import { createClient } from '../supabase/server';
import { parseSigmaRule } from './sigmaParser';

export interface RuleMatch {
  ruleId: string;
  ruleName: string;
  severity: string;
  matchedAt: Date;
}

export async function runDetectionRules(alertData: any, orgId: string): Promise<RuleMatch[]> {
  const supabase = await createClient();
  const { data: rules, error } = await supabase
    .from('detection_rules')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .eq('type', 'sigma');

  if (error) {
    console.error('[SigmaEngine] Error fetching rules:', error);
    return [];
  }

  const matches: RuleMatch[] = [];

  for (const ruleRecord of rules || []) {
    try {
      const sigma = parseSigmaRule(ruleRecord.rule_content);
      const isMatch = evaluateRule(sigma, alertData);

      if (isMatch) {
        matches.push({
          ruleId: ruleRecord.id,
          ruleName: ruleRecord.name,
          severity: ruleRecord.severity,
          matchedAt: new Date()
        });

        // Update hit count
        await supabase.rpc('increment_rule_hit', { rule_id: ruleRecord.id });
      }
    } catch (err) {
      console.error(`[SigmaEngine] Error processing rule ${ruleRecord.id}:`, err);
    }
  }

  return matches;
}

function evaluateRule(rule: any, data: any): boolean {
  const { detection } = rule;
  const condition = detection.condition;

  // Basic evaluation logic for "selection"
  if (condition === 'selection' && detection.selection) {
    return matchesSelection(detection.selection, data);
  }

  return false;
}

function matchesSelection(selection: any, data: any): boolean {
  for (const [field, pattern] of Object.entries(selection)) {
    const value = data[field];
    if (value === undefined) return false;

    if (Array.isArray(pattern)) {
      if (!pattern.includes(value)) return false;
    } else if (typeof pattern === 'string' && pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
      if (!regex.test(String(value))) return false;
    } else {
      if (value !== pattern) return false;
    }
  }
  return true;
}
