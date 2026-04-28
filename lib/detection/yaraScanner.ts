export interface YaraMatch {
  ruleName: string;
  tags: string[];
  matches: string[];
}

export function scanWithYara(content: string, yaraRule: string): YaraMatch | null {
  // Simple regex-based fallback for YARA logic
  // Extract strings from YARA rule (e.g., $s1 = "malicious")
  const stringMatches = yaraRule.match(/\$([a-zA-Z0-9_]+)\s*=\s*"([^"]+)"/g);
  if (!stringMatches) return null;

  const patterns = stringMatches.map(m => {
    const parts = m.match(/\$([a-zA-Z0-9_]+)\s*=\s*"([^"]+)"/);
    return { name: parts![1], value: parts![2] };
  });

  const found: string[] = [];
  for (const pattern of patterns) {
    if (content.includes(pattern.value)) {
      found.push(pattern.name);
    }
  }

  // Extract condition (simplified: if ANY found)
  if (found.length > 0) {
    const ruleNameMatch = yaraRule.match(/rule\s+([a-zA-Z0-9_]+)/);
    return {
      ruleName: ruleNameMatch ? ruleNameMatch[1] : 'Unknown',
      tags: [],
      matches: found
    };
  }

  return null;
}

export function scanEvidence(evidence: any, rules: { name: string, content: string }[]): YaraMatch[] {
  const content = JSON.stringify(evidence);
  const results: YaraMatch[] = [];

  for (const rule of rules) {
    const match = scanWithYara(content, rule.content);
    if (match) {
      results.push(match);
    }
  }

  return results;
}
