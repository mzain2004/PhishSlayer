import { SupabaseClient } from "@supabase/supabase-js";
import { 
  SOCDashboardMetrics, 
  TopAlertType, 
  ComplianceMapping, 
  ComplianceControl 
} from "../soc/types";

export class MetricsEngine {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  public async getDashboardMetrics(org_id: string, period_hours: number = 24): Promise<SOCDashboardMetrics> {
    const now = new Date();
    const startTime = new Date(now.getTime() - period_hours * 60 * 60 * 1000).toISOString();
    const prevStartTime = new Date(now.getTime() - 2 * period_hours * 60 * 60 * 1000).toISOString();

    const fetchMetrics = async (start: string, end: string) => {
      const { data: alerts } = await this.supabase
        .from("alerts")
        .select("*")
        .eq("org_id", org_id)
        .gte("created_at", start)
        .lte("created_at", end);

      const { data: cases } = await this.supabase
        .from("cases")
        .select("*")
        .eq("org_id", org_id)
        .gte("created_at", start)
        .lte("created_at", end);

      const total_alerts = alerts?.length || 0;
      const open_alerts = alerts?.filter(a => a.status === 'open').length || 0;
      const closed_alerts = alerts?.filter(a => a.status === 'closed' || a.status === 'resolved').length || 0;

      // MTTD
      const enrichedAlerts = alerts?.filter(a => a.first_enriched_at) || [];
      const mttd = enrichedAlerts.length > 0 
        ? enrichedAlerts.reduce((acc, a) => acc + (new Date(a.first_enriched_at).getTime() - new Date(a.created_at).getTime()), 0) / (enrichedAlerts.length * 60000)
        : 0;

      // MTTR
      const closedCases = cases?.filter(c => c.closed_at) || [];
      const mttr = closedCases.length > 0
        ? closedCases.reduce((acc, c) => acc + (new Date(c.closed_at).getTime() - new Date(c.created_at).getTime()), 0) / (closedCases.length * 60000)
        : 0;

      // Risk Score
      const criticalCases = cases?.filter(c => c.severity === 'p1' && c.status === 'open').length || 0;
      const slaBreaches = 0; // Simulation
      
      let score = 50;
      score += criticalCases * 15;
      score += slaBreaches * 10;
      score += (mttd / 60) * 5;
      if (total_alerts > 0) score -= (closed_alerts / total_alerts) * 20;
      score = Math.min(Math.max(Math.round(score), 0), 100);

      return { total_alerts, open_alerts, closed_alerts, mttd, mttr, score, criticalCases, alerts, cases };
    };

    const current = await fetchMetrics(startTime, now.toISOString());
    const previous = await fetchMetrics(prevStartTime, startTime);

    // Hourly volume
    const volumeByHour = new Array(24).fill(0);
    current.alerts?.forEach(a => {
        const hour = new Date(a.created_at).getUTCHours();
        volumeByHour[hour]++;
    });

    // Top Alert Types
    const typeCounts: Record<string, number> = {};
    current.alerts?.forEach(a => {
        typeCounts[a.alert_type] = (typeCounts[a.alert_type] || 0) + 1;
    });
    const top_alert_types: TopAlertType[] = Object.entries(typeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({
            alert_type: type,
            count,
            percentage: current.total_alerts > 0 ? (count / current.total_alerts) * 100 : 0
        }));

    // Top IPs
    const ipCounts: Record<string, number> = {};
    current.alerts?.forEach(a => {
        if (a.source_ip && !a.source_ip.startsWith('10.') && !a.source_ip.startsWith('192.168.')) {
            ipCounts[a.source_ip] = (ipCounts[a.source_ip] || 0) + 1;
        }
    });
    const top_source_ips = Object.entries(ipCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([ip]) => ip);

    let trend: "improving" | "degrading" | "stable" = "stable";
    if (current.score < previous.score - 5) trend = "improving";
    else if (current.score > previous.score + 5) trend = "degrading";

    return {
      org_id,
      period_hours,
      total_alerts: current.total_alerts,
      open_alerts: current.open_alerts,
      closed_alerts: current.closed_alerts,
      mttd_minutes: Math.round(current.mttd),
      mttr_minutes: Math.round(current.mttr),
      sla_breaches: 0,
      alert_volume_by_hour: volumeByHour,
      top_alert_types,
      top_source_ips,
      active_cases: current.cases?.filter(c => c.status === 'open').length || 0,
      critical_cases: current.criticalCases,
      hunt_missions_run: 0, // Simplified
      sigma_rules_generated: 0, // Simplified
      risk_score: current.score,
      trend_vs_previous_period: trend
    };
  }

  public async getComplianceMapping(org_id: string, framework: string): Promise<ComplianceMapping> {
    const now = new Date();
    
    // NIST CSF Controls
    const nistControls: ComplianceControl[] = [
      { control_id: "ID.AM-1", control_name: "Asset inventory", description: "Maintain inventory of physical devices and systems.", status: "implemented", evidence: ["wazuh_agents table records"], phishslayer_features: ["Endpoint Monitoring"] },
      { control_id: "ID.AM-2", control_name: "Software inventory", description: "Maintain inventory of software platforms and applications.", status: "partial", evidence: ["sigma_rules detection inventory"], phishslayer_features: ["Sigma Rule Engine"] },
      { control_id: "PR.AC-1", control_name: "Identity management", description: "Manage access to assets and facilities.", status: "implemented", evidence: ["Clerk Auth integration"], phishslayer_features: ["Multi-Tenant RBAC"] },
      { control_id: "PR.AC-3", control_name: "Remote access management", description: "Manage remote access to networks and devices.", status: "partial", evidence: ["Wazuh active response"], phishslayer_features: ["Autonomous Containment"] },
      { control_id: "DE.CM-1", control_name: "Network monitoring", description: "Monitor network to detect potential cybersecurity events.", status: "implemented", evidence: ["Alerts table network telemetry"], phishslayer_features: ["Network IDS"] },
      { control_id: "DE.CM-7", control_name: "Unauthorized activity monitoring", description: "Monitor for unauthorized activity.", status: "implemented", evidence: ["ueba_anomalies table"], phishslayer_features: ["UEBA Engine"] },
      { control_id: "RS.RP-1", control_name: "Response plan", description: "Maintain and test recovery plans.", status: "implemented", evidence: ["playbook_executions"], phishslayer_features: ["SOAR Playbooks"] },
      { control_id: "RS.MI-1", control_name: "Incident containment", description: "Incidents are contained.", status: "partial", evidence: ["Cases contained status"], phishslayer_features: ["Autonomous Triage"] },
      { control_id: "RC.RP-1", control_name: "Recovery plan", description: "Recovery plans are executed.", status: "not_implemented", evidence: ["Manual process required"], phishslayer_features: [] }
    ];

    // ISO 27001 Controls
    const isoControls: ComplianceControl[] = [
        { control_id: "A.12.4.1", control_name: "Event logging", description: "Logs recording user activities, exceptions, faults and information security events shall be produced.", status: "implemented", evidence: ["Alerts table"], phishslayer_features: ["Centralized Logging"] },
        { control_id: "A.12.6.1", control_name: "Vulnerability management", description: "Information about technical vulnerabilities of information systems being used shall be obtained.", status: "partial", evidence: ["Sigma rule scanning"], phishslayer_features: ["Vulnerability Triage"] },
        { control_id: "A.16.1.1", control_name: "Incident management", description: "Management responsibilities and procedures shall be established.", status: "implemented", evidence: ["Cases table"], phishslayer_features: ["Case Management System"] },
        { control_id: "A.16.1.4", control_name: "Incident assessment", description: "Information security events shall be assessed.", status: "implemented", evidence: ["Case severity assignment"], phishslayer_features: ["Automated Severity Scoring"] },
        { control_id: "A.16.1.5", control_name: "Incident response", description: "Information security incidents shall be responded to.", status: "implemented", evidence: ["Playbook engine logs"], phishslayer_features: ["SOAR"] },
        { control_id: "A.16.1.6", control_name: "Lessons learned", description: "Knowledge gained from information security incidents shall be used.", status: "partial", evidence: ["Hunt findings feedback"], phishslayer_features: ["Threat Hunting"] }
    ];

    // SOC2 Controls
    const soc2Controls: ComplianceControl[] = [
        { control_id: "CC6.1", control_name: "Logical access", description: "Implement logical access security software.", status: "implemented", evidence: ["Clerk JWT integration"], phishslayer_features: ["Enterprise Auth"] },
        { control_id: "CC6.6", control_name: "Logical access restriction", description: "Restrict logical access to assets.", status: "implemented", evidence: ["Tenant user RBAC"], phishslayer_features: ["Multi-Tenancy"] },
        { control_id: "CC7.2", control_name: "System monitoring", description: "Monitor for vulnerabilities and potential security events.", status: "implemented", evidence: ["Alerts and UEBA records"], phishslayer_features: ["Continuous Monitoring"] },
        { control_id: "CC7.3", control_name: "Evaluation of security events", description: "Evaluate security events and alerts.", status: "implemented", evidence: ["Cases table triage"], phishslayer_features: ["Autonomous Analyst"] },
        { control_id: "CC7.4", control_name: "Incident response", description: "Respond to identified security incidents.", status: "implemented", evidence: ["Playbook execution logs"], phishslayer_features: ["Playbook Engine"] },
        { control_id: "CC9.2", control_name: "Risk mitigation", description: "Identify and mitigate potential risks.", status: "partial", evidence: ["Attack path reconstruction"], phishslayer_features: ["Attack Path Analysis"] }
    ];

    let controls: ComplianceControl[] = [];
    if (framework === "nist_csf") controls = nistControls;
    else if (framework === "iso_27001") controls = isoControls;
    else if (framework === "soc2") controls = soc2Controls;

    const implementedCount = controls.filter(c => c.status === "implemented").length;
    const coverage = (implementedCount / controls.length) * 100;

    return {
      framework: framework as any,
      controls,
      coverage_percentage: Math.round(coverage),
      last_assessed_at: now
    };
  }
}
