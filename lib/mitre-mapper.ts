export interface MitreTechnique {
  id: string;
  name: string;
  confidence: number;
}

type BehaviorRule = {
  id: string;
  name: string;
  confidence: number;
  patterns: RegExp[];
};

const MALWARE_BEHAVIOR_RULES: BehaviorRule[] = [
  {
    id: "T1055",
    name: "Process Injection",
    confidence: 0.9,
    patterns: [
      /createremotethread/i,
      /virtualalloc/i,
      /writeprocessmemory/i,
      /queueuserapc/i,
      /setthreadcontext/i,
    ],
  },
  {
    id: "T1547",
    name: "Registry Run Keys / Startup Items",
    confidence: 0.85,
    patterns: [/hkey_/i, /regsetvalue/i, /run\\/i, /runonce/i],
  },
  {
    id: "T1071",
    name: "Application Layer Protocol",
    confidence: 0.8,
    patterns: [/http/i, /https/i, /dns/i, /beacon/i, /c2/i, /socket/i],
  },
  {
    id: "T1003",
    name: "OS Credential Dumping",
    confidence: 0.9,
    patterns: [/lsass/i, /mimikatz/i, /sekurlsa/i, /cred/i],
  },
  {
    id: "T1486",
    name: "Data Encrypted for Impact",
    confidence: 0.95,
    patterns: [/encrypt/i, /ransom/i, /crypt/i, /aes/i],
  },
  {
    id: "T1021",
    name: "Remote Services",
    confidence: 0.75,
    patterns: [/wmic/i, /psexec/i, /rdp/i, /smb/i, /winrm/i],
  },
  {
    id: "T1562",
    name: "Impair Defenses",
    confidence: 0.85,
    patterns: [/disable/i, /defender/i, /av/i, /firewall/i, /tamper/i],
  },
  {
    id: "T1082",
    name: "System Information Discovery",
    confidence: 0.7,
    patterns: [/systeminfo/i, /wmic/i, /hostname/i, /whoami/i, /ipconfig/i],
  },
];

export function mapToMitre(
  suspiciousStrings: string[],
  peImports: string[],
): MitreTechnique[] {
  const corpus = [...suspiciousStrings, ...peImports].join("\n");
  const seen = new Set<string>();
  const mapped: MitreTechnique[] = [];

  for (const rule of MALWARE_BEHAVIOR_RULES) {
    const isMatch = rule.patterns.some((pattern) => pattern.test(corpus));
    if (!isMatch || seen.has(rule.id)) {
      continue;
    }

    seen.add(rule.id);
    mapped.push({
      id: rule.id,
      name: rule.name,
      confidence: rule.confidence,
    });
  }

  return mapped;
}
