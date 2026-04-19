import { createClient } from "@supabase/supabase-js";
import { sanitizePromptInput } from "@/lib/security/sanitize";
import type { MitreTechnique } from "@/lib/mitre-mapper";

export type EntropyRisk = "low" | "medium" | "high" | "critical";

export interface VirusTotalResult {
  detected: number;
  total: number;
  score: string;
  permalink: string | null;
  result: Record<string, unknown>;
}

export interface StaticAnalysisInput {
  fileName: string;
  fileType: string;
  entropy: number;
  suspiciousStrings: string[];
  vtScore: string;
  peImports: string[];
}

export interface StaticAnalysisRecord {
  organization_id?: string | null;
  alert_id?: string | null;
  file_name: string;
  file_hash_md5?: string | null;
  file_hash_sha256?: string | null;
  file_size_bytes: number;
  file_type: string;
  entropy_score: number;
  entropy_risk: EntropyRisk;
  strings_extracted: string[];
  suspicious_strings: string[];
  virustotal_score: string;
  virustotal_detected: number;
  virustotal_total: number;
  virustotal_result: Record<string, unknown>;
  pe_imports: string[];
  pe_sections: string[];
  mitre_techniques: MitreTechnique[];
  gemini_report: string;
  risk_score: number;
  verdict: "clean" | "suspicious" | "malicious" | "unknown";
  analysis_duration_ms: number;
}

export function calculateEntropy(data: string): number {
  if (!data) {
    return 0;
  }

  const frequency = new Map<string, number>();
  for (const char of data) {
    frequency.set(char, (frequency.get(char) || 0) + 1);
  }

  const length = data.length;
  let entropy = 0;

  for (const count of frequency.values()) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }

  return Math.max(0, Math.min(8, entropy));
}

export function mapEntropyRisk(entropy: number): EntropyRisk {
  if (entropy < 4) {
    return "low";
  }

  if (entropy <= 5) {
    return "medium";
  }

  if (entropy <= 6) {
    return "high";
  }

  return "critical";
}

export function extractSuspiciousStrings(strings: string[]): string[] {
  const patterns = [
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/i,
    /https?:\/\//i,
    /HKEY_/i,
    /CreateRemoteThread|VirtualAlloc|WriteProcessMemory|LoadLibrary|GetProcAddress|RegSetValue|WinExec|ShellExecute/i,
  ];

  const unique = new Set<string>();

  for (const value of strings) {
    if (patterns.some((pattern) => pattern.test(value))) {
      unique.add(value);
    }
  }

  return Array.from(unique);
}

export async function checkVirusTotal(hash: string): Promise<VirusTotalResult> {
  const apiKey = process.env.VIRUS_TOTAL_API_KEY;

  if (!apiKey || !hash) {
    return {
      detected: 0,
      total: 0,
      score: "0/0",
      permalink: null,
      result: {},
    };
  }

  const response = await fetch(
    `https://www.virustotal.com/api/v3/files/${encodeURIComponent(hash)}`,
    {
      method: "GET",
      headers: {
        "x-apikey": apiKey,
      },
    },
  );

  if (response.status === 404) {
    return {
      detected: 0,
      total: 0,
      score: "0/0",
      permalink: `https://www.virustotal.com/gui/file/${hash}`,
      result: { not_found: true },
    };
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `VirusTotal request failed (${response.status}): ${errorText}`,
    );
  }

  const payload = (await response.json()) as {
    data?: {
      attributes?: {
        last_analysis_stats?: {
          malicious?: number;
          suspicious?: number;
          harmless?: number;
          undetected?: number;
          timeout?: number;
        };
      };
      links?: {
        self?: string;
      };
    };
  };

  const stats = payload.data?.attributes?.last_analysis_stats;
  const malicious = stats?.malicious || 0;
  const suspicious = stats?.suspicious || 0;
  const detected = malicious + suspicious;
  const total =
    (stats?.malicious || 0) +
    (stats?.suspicious || 0) +
    (stats?.harmless || 0) +
    (stats?.undetected || 0) +
    (stats?.timeout || 0);

  return {
    detected,
    total,
    score: `${detected}/${total}`,
    permalink:
      payload.data?.links?.self ||
      `https://www.virustotal.com/gui/file/${hash}`,
    result: payload as unknown as Record<string, unknown>,
  };
}

export function buildGeminiAnalysisPrompt(data: StaticAnalysisInput): string {
  const safeFileName = sanitizePromptInput(data.fileName, 200);
  const safeFileType = sanitizePromptInput(data.fileType, 120);
  const safeStrings = sanitizePromptInput(
    JSON.stringify(data.suspiciousStrings.slice(0, 50)),
    1200,
  );
  const safeScore = sanitizePromptInput(data.vtScore, 40);
  const safeImports = sanitizePromptInput(
    JSON.stringify(data.peImports.slice(0, 100)),
    1200,
  );
  return `You are a malware reverse-engineering analyst for an enterprise SOC.
Analyze this potentially malicious file and produce concise, actionable output.

File metadata:
- File name: ${safeFileName}
- File type: ${safeFileType}
- Shannon entropy: ${data.entropy.toFixed(3)} / 8
- Suspicious strings: ${safeStrings}
- VirusTotal score: ${safeScore}
- PE imports: ${safeImports}

Return ONLY valid JSON with this exact schema:
{
  "threat_classification": "clean|suspicious|malicious|unknown",
  "risk_score": 0,
  "summary": "short analyst narrative",
  "mitre_techniques": [
    {"id": "Txxxx", "name": "Technique name", "confidence": 0.0}
  ],
  "recommended_actions": ["action 1", "action 2"],
  "evidence": ["indicator 1", "indicator 2"]
}

Requirements:
- Include threat classification.
- Include MITRE ATT&CK techniques where applicable.
- Include recommended response actions for SOC operations.
- risk_score must be an integer from 0 to 100.`;
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function saveStaticAnalysis(
  analysis: StaticAnalysisRecord,
): Promise<string> {
  const client = getAdminClient();
  const { data, error } = await client
    .from("static_analysis")
    .insert(analysis)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message || "Failed to save static analysis");
  }

  return data.id;
}
