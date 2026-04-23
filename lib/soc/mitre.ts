import { RawAlert } from "./types";
import { geminiGenerateText } from "@/lib/ai/gemini";

export interface MitreTag {
  tactic: string;
  technique: string;
  technique_id: string;
}

const MITRE_MAP: Record<string, MitreTag> = {
  brute_force: {
    tactic: "Credential Access",
    technique: "Brute Force",
    technique_id: "T1110",
  },
  phishing: {
    tactic: "Initial Access",
    technique: "Phishing",
    technique_id: "T1566",
  },
  lateral_movement: {
    tactic: "Lateral Movement",
    technique: "Remote Services",
    technique_id: "T1021",
  },
  data_exfiltration: {
    tactic: "Exfiltration",
    technique: "Exfiltration Over Alternative Protocol",
    technique_id: "T1041",
  },
  malware: {
    tactic: "Execution",
    technique: "User Execution",
    technique_id: "T1204",
  },
  privilege_escalation: {
    tactic: "Privilege Escalation",
    technique: "Exploitation for Privilege Escalation",
    technique_id: "T1068",
  },
  persistence: {
    tactic: "Persistence",
    technique: "Scheduled Task/Job",
    technique_id: "T1053",
  },
};

export async function tagWithMITRE(alert: RawAlert): Promise<MitreTag> {
  const type = alert.rule_id || alert.title?.toLowerCase().replace(/\s+/g, "_");
  
  if (type && MITRE_MAP[type]) {
    return MITRE_MAP[type];
  }

  // Fallback to Gemini for unknown types
  try {
    const prompt = `Given the following security alert, identify the most relevant MITRE ATT&CK tactic, technique, and technique ID.
    Alert Title: ${alert.title}
    Alert Description: ${JSON.stringify(alert)}
    
    Return ONLY a JSON object with this format:
    {"tactic": "Tactic Name", "technique": "Technique Name", "technique_id": "Txxxx"}`;

    const response = await geminiGenerateText(prompt);
    // Strip markdown code fences if present
    const cleaned = response.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as MitreTag;
  } catch (error) {
    console.error("Gemini MITRE tagging failure:", error);
    return {
      tactic: "Unknown",
      technique: "Unknown",
      technique_id: "T0000",
    };
  }
}
