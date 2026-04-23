import { SupabaseClient } from "@supabase/supabase-js";
import { RawAlert, UEBAAnomaly, EntityRiskScore, RiskFactor, UserBehaviorProfile } from "./types";
import { v4 as uuidv4 } from "uuid";

export class UEBAEngine {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  public async analyzeUserBehavior(user_id: string, alert: RawAlert): Promise<UEBAAnomaly[]> {
    const anomalies: UEBAAnomaly[] = [];
    const now = new Date();

    // Check 1: impossible_travel
    const { data: lastAlerts } = await this.supabase
      .from("alerts")
      .select("timestamp, source_ip, raw_log")
      .eq("user_id", user_id)
      .order("timestamp", { ascending: false })
      .limit(5);

    if (lastAlerts && lastAlerts.length > 0) {
      const prev = lastAlerts[0];
      const prevCountry = prev.raw_log?.data?.geoip?.country_code;
      const currCountry = alert.raw_log?.data?.geoip?.country_code;
      
      if (prevCountry && currCountry && prevCountry !== currCountry) {
        const timeDiffMin = (now.getTime() - new Date(prev.timestamp).getTime()) / (1000 * 60);
        if (timeDiffMin < 120) { // 2 hours
          anomalies.push({
            id: uuidv4(),
            user_id,
            entity_id: user_id,
            entity_type: "user",
            anomaly_type: "impossible_travel",
            severity: "critical",
            description: `User logged in from ${prevCountry} and ${currCountry} within ${Math.round(timeDiffMin)} minutes`,
            evidence: { prev_alert: prev, current_alert: alert },
            detected_at: now,
            case_id: null,
            suppressed: false
          });
        }
      }
    }

    // Check 2: off_hours_login
    const hour = new Date(alert.timestamp).getUTCHours();
    const { data: profile } = await this.supabase
      .from("ueba_profiles")
      .select("baseline_login_hours")
      .eq("user_id", user_id)
      .maybeSingle();

    const isAuthAlert = alert.alert_type?.toLowerCase().includes("login") || alert.alert_type?.toLowerCase().includes("auth");
    if (profile && isAuthAlert && !profile.baseline_login_hours.includes(hour)) {
      const severity = (hour >= 0 && hour <= 5) ? "high" : "medium";
      anomalies.push({
        id: uuidv4(),
        user_id,
        entity_id: user_id,
        entity_type: "user",
        anomaly_type: "off_hours_login",
        severity,
        description: `Login detected at ${hour}:00 UTC, which is outside normal baseline hours.`,
        evidence: { hour, baseline: profile.baseline_login_hours },
        detected_at: now,
        case_id: null,
        suppressed: false
      });
    }

    // Check 3: excessive_failed_logins
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const { count } = await this.supabase
      .from("alerts")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user_id)
      .in("rule_id", ["5710", "5712"])
      .gte("timestamp", fifteenMinsAgo);

    if (count && count > 10) {
      anomalies.push({
        id: uuidv4(),
        user_id,
        entity_id: user_id,
        entity_type: "user",
        anomaly_type: "excessive_failed_logins",
        severity: "high",
        description: `${count} failed logins in 15 minutes`,
        evidence: { count, timeframe: "15m" },
        detected_at: now,
        case_id: null,
        suppressed: false
      });
    }

    // Check 4: privilege_escalation
    const rawLogStr = JSON.stringify(alert.raw_log || "").toLowerCase();
    const peKeywords = ["sudo", "privilege", "escalat", "admin", "root"];
    if (peKeywords.some(k => rawLogStr.includes(k))) {
      anomalies.push({
        id: uuidv4(),
        user_id,
        entity_id: user_id,
        entity_type: "user",
        anomaly_type: "privilege_escalation",
        severity: "critical",
        description: "Privilege escalation keywords detected in alert logs.",
        evidence: { matched_keywords: peKeywords.filter(k => rawLogStr.includes(k)) },
        detected_at: now,
        case_id: null,
        suppressed: false
      });
    }

    // Persist anomalies
    if (anomalies.length > 0) {
      await this.supabase.from("ueba_anomalies").insert(anomalies.map(a => ({
        ...a,
        detected_at: a.detected_at.toISOString()
      })));
    }

    return anomalies;
  }

  public async calculateEntityRiskScore(entity_id: string, entity_type: "user" | "host" | "ip"): Promise<EntityRiskScore> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: anomalies } = await this.supabase
      .from("ueba_anomalies")
      .select("*")
      .eq("entity_id", entity_id)
      .eq("entity_type", entity_type)
      .eq("suppressed", false)
      .gte("detected_at", thirtyDaysAgo);

    const factors: RiskFactor[] = [];
    let score = 0;

    const recentAnomalies = anomalies?.filter(a => new Date(a.detected_at) >= new Date(twentyFourHoursAgo)) || [];
    
    if (recentAnomalies.some(a => a.severity === "critical")) {
      score += 40;
      factors.push({ name: "Recent Critical Anomaly", contribution: 40, description: "Critical anomaly detected in last 24h" });
    }
    if (recentAnomalies.some(a => a.severity === "high")) {
      score += 25;
      factors.push({ name: "Recent High Anomaly", contribution: 25, description: "High severity anomaly detected in last 24h" });
    }
    if (recentAnomalies.some(a => a.severity === "medium")) {
      score += 10;
      factors.push({ name: "Recent Medium Anomaly", contribution: 10, description: "Medium severity anomaly detected in last 24h" });
    }

    const uniqueTypes = new Set(anomalies?.filter(a => new Date(a.detected_at) >= new Date(sevenDaysAgo)).map(a => a.anomaly_type) || []);
    if (uniqueTypes.size > 0) {
      const contrib = uniqueTypes.size * 5;
      score += contrib;
      factors.push({ name: "Anomaly Diversity", contribution: contrib, description: `${uniqueTypes.size} unique anomaly types in last 7 days` });
    }

    const { count: recentAlerts } = await this.supabase
      .from("alerts")
      .select("*", { count: 'exact', head: true })
      .eq(entity_type === "user" ? "user_id" : (entity_type === "host" ? "agent_id" : "source_ip"), entity_id)
      .gte("timestamp", twentyFourHoursAgo);

    if (recentAlerts && recentAlerts > 100) {
      score += 15;
      factors.push({ name: "High Alert Volume", contribution: 15, description: "More than 100 alerts in last 24h" });
    }

    score = Math.min(score, 100);

    // Trend calculation
    let trend: "increasing" | "decreasing" | "stable" = "stable";
    // For real trend, we would need a history of scores. Simplified here:
    // Compare with score from 7 days ago (simulation)
    const prevScore = 50; // Placeholder
    if (score - prevScore > 10) trend = "increasing";
    else if (score - prevScore < -10) trend = "decreasing";

    const result: EntityRiskScore = {
      entity_id,
      entity_type,
      score,
      factors,
      last_calculated: now,
      trend
    };

    // Update profile risk score if user
    if (entity_type === "user") {
      await this.supabase.from("ueba_profiles").update({ risk_score: score, last_updated: now.toISOString() }).eq("user_id", entity_id);
    }

    return result;
  }

  public async updateUserProfile(user_id: string, alert: RawAlert) {
    const hour = new Date(alert.timestamp).getUTCHours();
    const country = alert.raw_log?.data?.geoip?.country_code;
    const now = new Date().toISOString();

    const { data: existing } = await this.supabase
      .from("ueba_profiles")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (existing) {
      const hours = Array.from(new Set([...existing.baseline_login_hours, hour])).slice(0, 24);
      const locations = Array.from(new Set([...existing.baseline_locations, ...(country ? [country] : [])])).slice(0, 10);
      
      await this.supabase.from("ueba_profiles").update({
        baseline_login_hours: hours,
        baseline_locations: locations,
        last_updated: now
      }).eq("user_id", user_id);
    } else {
      await this.supabase.from("ueba_profiles").insert({
        user_id,
        username: alert.agent_name || "unknown", // Fallback
        org_id: alert.raw_log?.org_id || "default",
        baseline_login_hours: [hour],
        baseline_locations: country ? [country] : [],
        last_updated: now
      });
    }
  }

  public async getHighRiskEntities(org_id: string): Promise<EntityRiskScore[]> {
    const { data } = await this.supabase
      .from("ueba_profiles")
      .select("*")
      .eq("org_id", org_id)
      .gt("risk_score", 70)
      .order("risk_score", { ascending: false })
      .limit(20);

    return (data || []).map(p => ({
      entity_id: p.user_id,
      entity_type: "user",
      score: p.risk_score,
      factors: [], // Summary wouldn't necessarily have all factors
      last_calculated: new Date(p.last_updated),
      trend: "stable"
    }));
  }
}
