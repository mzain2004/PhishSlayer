import { createClient } from "@supabase/supabase-js";
import { sanitizePromptInput } from "@/lib/security/sanitize";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface ReasoningChain {
  organization_id?: string | null;
  alert_id?: string;
  escalation_id?: string;
  agent_level: "L1" | "L2" | "L3";
  decision: string;
  confidence_score?: number;
  reasoning_text: string;
  iocs_considered?: any[];
  actions_taken?: any[];
  model_used?: string;
  execution_time_ms?: number;
}

export async function saveReasoningChain(chain: ReasoningChain): Promise<void> {
  const { error } = await supabase.from("agent_reasoning").insert(chain);

  if (error) {
    console.error("[ReasoningChain] Failed to save:", error.message);
  }
}

export function buildL1ReasoningPrompt(alert: any): string {
  const safeRule = sanitizePromptInput(
    alert.rule_description || "Unknown",
    300,
  );
  const safeSeverity = sanitizePromptInput(alert.level || "Unknown", 50);
  const safeSourceIp = sanitizePromptInput(alert.source_ip || "Unknown", 100);
  const safeAgent = sanitizePromptInput(alert.agent_name || "Unknown", 100);
  const safeTimestamp = sanitizePromptInput(alert.timestamp || "Unknown", 80);
  const safeLog = sanitizePromptInput(
    JSON.stringify(alert.full_log || {}),
    600,
  );
  return `You are an L1 SOC Triage Analyst. Analyze this security alert and explain your decision.

ALERT DATA:
- Rule: ${safeRule}
- Severity Level: ${safeSeverity}
- Source IP: ${safeSourceIp}
- Agent: ${safeAgent}
- Timestamp: ${safeTimestamp}
- Raw Data: ${safeLog}

Respond in this EXACT JSON format:
{
  "decision": "CLOSE or ESCALATE",
  "confidence": 0.0-1.0,
  "reasoning": "2-3 sentence human-readable explanation of why you made this decision",
  "iocs": ["list", "of", "indicators"],
  "risk_factors": ["list", "of", "risk", "factors"],
  "recommended_actions": ["list", "of", "actions"]
}`;
}

export function buildL2ReasoningPrompt(escalation: any): string {
  const safeRule = sanitizePromptInput(escalation.alert_rule || "Unknown", 300);
  const safeSeverity = sanitizePromptInput(
    escalation.severity || "Unknown",
    50,
  );
  const safeSourceIp = sanitizePromptInput(
    escalation.source_ip || "Unknown",
    100,
  );
  const safeConfidence = sanitizePromptInput(
    String(escalation.l1_confidence || "Unknown"),
    50,
  );
  const safeReasoning = sanitizePromptInput(
    escalation.l1_reasoning || "Unknown",
    800,
  );
  return `You are an L2 SOC Responder. An L1 agent escalated this alert. Decide what autonomous action to take.

ESCALATION DATA:
- Alert Rule: ${safeRule}
- Severity: ${safeSeverity}
- Source IP: ${safeSourceIp}
- L1 Confidence: ${safeConfidence}
- L1 Reasoning: ${safeReasoning}

AVAILABLE ACTIONS: BLOCK_IP, ISOLATE_IDENTITY, ESCALATE_TO_HUMAN, MONITOR

Respond in this EXACT JSON format:
{
  "decision": "BLOCK_IP or ISOLATE_IDENTITY or ESCALATE_TO_HUMAN or MONITOR",
  "confidence": 0.0-1.0,
  "reasoning": "2-3 sentence explanation of your decision and what threat you identified",
  "actions_taken": ["list", "of", "actions"],
  "iocs": ["list", "of", "indicators"]
}`;
}

export function buildL3ReasoningPrompt(hunts: any[]): string {
  const safeHunts = sanitizePromptInput(
    JSON.stringify(hunts.slice(0, 10), null, 2),
    1200,
  );
  return `You are an L3 Threat Hunter. Review these IOC matches from CTI feeds and explain your findings.

HUNT RESULTS:
${safeHunts}

Respond in this EXACT JSON format:
{
  "decision": "THREAT_CONFIRMED or FALSE_POSITIVE or NEEDS_INVESTIGATION",
  "confidence": 0.0-1.0,
  "reasoning": "2-3 sentence summary of what threats were found and their significance",
  "iocs": ["list", "of", "confirmed", "iocs"],
  "threat_actors": ["associated", "threat", "actors", "if", "known"]
}`;
}
