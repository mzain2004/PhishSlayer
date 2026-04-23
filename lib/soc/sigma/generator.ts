import { SupabaseClient } from "@supabase/supabase-js";
import { 
  HuntFinding, 
  SigmaRule, 
  SigmaGenerationResult, 
  SigmaTestResult, 
  SigmaLogsource, 
  SigmaDetection 
} from "../types";
import { v4 as uuidv4 } from "uuid";
import { getWazuhApiToken } from "@/lib/wazuh-client";

export class SigmaGenerator {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  public async generateFromFinding(finding: HuntFinding): Promise<SigmaGenerationResult> {
    const id = uuidv4();
    const now = new Date();

    // Step 1: Build detection logic
    const evidence = finding.evidence || {};
    const selection: Record<string, any> = {};

    // Basic heuristic to extract indicators from evidence
    if (evidence.data?.process?.name) selection["Image|endswith"] = evidence.data.process.name;
    if (evidence.data?.process?.command_line) {
        const cmd = evidence.data.process.command_line;
        if (cmd.includes("powershell")) selection["CommandLine|contains"] = ["powershell", "encodedcommand"];
        else selection["CommandLine|contains"] = cmd.split(" ").slice(0, 2);
    }
    if (evidence.data?.file?.path) selection["TargetFilename"] = evidence.data.file.path;
    if (evidence.data?.registry?.key) selection["TargetObject"] = evidence.data.registry.key;
    if (evidence.source_ip) selection["SourceIp"] = evidence.source_ip;

    const detection: SigmaDetection = {
      selection,
      condition: "selection",
      timeframe: null
    };

    // Step 2: Determine logsource
    let category = "process_creation";
    if (finding.mitre_tactic.includes("Network") || finding.mitre_tactic.includes("Exfiltration")) category = "network_connection";
    else if (finding.mitre_tactic.includes("Persistence")) category = "registry_event";

    const logsource: SigmaLogsource = {
      category,
      product: "windows",
      service: null
    };

    // Step 3: Build SigmaRule object
    const rule: SigmaRule = {
      id,
      title: `Auto-Generated: ${finding.title}`,
      description: finding.description,
      status: "experimental",
      level: finding.severity as any,
      logsource,
      detection,
      falsepositives: ["Legitimate administrative activity", "Authorized security tools"],
      tags: [
        `attack.${finding.mitre_technique.toLowerCase()}`,
        `attack.${finding.mitre_tactic.toLowerCase().replace(/\s+/g, "_")}`
      ],
      author: "PhishSlayer AutoGen",
      created_at: now,
      hunt_finding_id: finding.id,
      tested: false,
      deployed: false,
      wazuh_rule_id: null
    };

    // Step 4: Convert to YAML
    const yaml = this.convertToYaml(rule);

    // Step 5: Insert into DB
    await this.supabase.from("sigma_rules").insert({
      id: rule.id,
      title: rule.title,
      description: rule.description,
      status: rule.status,
      level: rule.level,
      logsource: rule.logsource,
      detection: rule.detection,
      falsepositives: rule.falsepositives,
      tags: rule.tags,
      author: rule.author,
      yaml_content: yaml,
      hunt_finding_id: finding.id,
      created_at: now.toISOString()
    });

    return {
      rule,
      yaml_content: yaml,
      test_result: null,
      deployed: false,
      wazuh_rule_id: null
    };
  }

  private convertToYaml(rule: SigmaRule): string {
    const indent = "    ";
    let yaml = `title: ${rule.title}\nid: ${rule.id}\nstatus: ${rule.status}\ndescription: ${rule.description}\n`;
    yaml += `author: ${rule.author}\ndate: ${rule.created_at.toISOString().split('T')[0]}\n`;
    yaml += `tags:\n${rule.tags.map(t => `${indent}- ${t}`).join('\n')}\n`;
    yaml += `logsource:\n${indent}product: ${rule.logsource.product}\n${indent}category: ${rule.logsource.category}\n`;
    yaml += `detection:\n${indent}selection:\n`;
    
    for (const [key, value] of Object.entries(rule.detection.selection)) {
        if (Array.isArray(value)) {
            yaml += `${indent}${indent}${key}:\n${value.map(v => `${indent}${indent}${indent}- '${v}'`).join('\n')}\n`;
        } else {
            yaml += `${indent}${indent}${key}: '${value}'\n`;
        }
    }
    
    yaml += `${indent}condition: ${rule.detection.condition}\n`;
    yaml += `falsepositives:\n${rule.falsepositives.map(fp => `${indent}- ${fp}`).join('\n')}\n`;
    yaml += `level: ${rule.level}\n`;
    
    return yaml;
  }

  public async testRule(rule: SigmaRule): Promise<SigmaTestResult> {
    const startTime = Date.now();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Query alerts with selection criteria (simplified jsonb matching)
    const { data: matches, count } = await this.supabase
      .from("alerts")
      .select("*", { count: 'exact' })
      .contains("raw_log", rule.detection.selection)
      .gte("timestamp", sevenDaysAgo)
      .limit(5);

    // FP Rate Estimation
    const matchedAlerts = count || 0;
    let approved = matchedAlerts < 1000;
    
    // Check against feedback
    const { count: fpCount } = await this.supabase
      .from("feedback_entries")
      .select("*", { count: 'exact', head: true })
      .eq("analyst_decision", "false_positive")
      .contains("notes", rule.detection.selection); // Rough check

    const fpRate = matchedAlerts > 0 ? ((fpCount || 0) / matchedAlerts) : 0;
    if (fpRate > 0.3) approved = false;

    const result: SigmaTestResult = {
      matched_alerts: matchedAlerts,
      false_positive_rate: fpRate,
      test_duration_ms: Date.now() - startTime,
      sample_matches: matches || [],
      approved
    };

    await this.supabase.from("sigma_rules").update({
      tested: true,
      test_results: result
    }).eq("id", rule.id);

    return result;
  }

  public async deployToWazuh(rule: SigmaRule): Promise<string | null> {
    const levelMap: Record<string, number> = { critical: 15, high: 12, medium: 8, low: 5 };
    const wazuh_rule_id = (200000 + Math.floor(Math.random() * 10000)).toString(); // Simulated increment

    // Convert to Wazuh XML
    let xml = `<group name="PhishSlayer_AutoGen">\n`;
    xml += `  <rule id="${wazuh_rule_id}" level="${levelMap[rule.level] || 10}">\n`;
    xml += `    <description>${rule.title}</description>\n`;
    
    for (const [key, value] of Object.entries(rule.detection.selection)) {
        xml += `    <field name="full_log">.*${value}.*</field>\n`;
    }
    
    xml += `    <mitre>\n`;
    rule.tags.filter(t => t.startsWith('attack.t')).forEach(t => {
        xml += `      <id>${t.split('.')[1].toUpperCase()}</id>\n`;
    });
    xml += `    </mitre>\n`;
    xml += `  </rule>\n</group>`;

    try {
      const token = await getWazuhApiToken();
      const response = await fetch("https://167.172.85.62:55000/rules", {
        method: "POST",
        headers: {
            "Content-Type": "application/xml",
            "Authorization": `Bearer ${token}`
        },
        body: xml
      });

      if (response.ok) {
        await this.supabase.from("sigma_rules").update({
          deployed: true,
          wazuh_rule_id
        }).eq("id", rule.id);
        return wazuh_rule_id;
      }
    } catch (e) {
      console.error("[sigma] deployment failed:", e);
    }

    return null;
  }

  public async generateAndDeploy(finding: HuntFinding): Promise<SigmaGenerationResult> {
    const gen = await this.generateFromFinding(finding);
    const test = await this.testRule(gen.rule);
    gen.test_result = test;

    if (test.approved) {
      const wazuhId = await this.deployToWazuh(gen.rule);
      gen.deployed = !!wazuhId;
      gen.wazuh_rule_id = wazuhId;
    }

    return gen;
  }

  public async getPendingRules(): Promise<SigmaRule[]> {
    const { data } = await this.supabase
      .from("sigma_rules")
      .select("*")
      .or("tested.eq.false,deployed.eq.false");
    
    return data || [];
  }
}
