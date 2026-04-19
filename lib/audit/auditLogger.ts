import { createClient } from "@/lib/supabase/server";
import { redactSensitive } from "@/lib/security/redact";

export type AuditAction =
  | "scan_launched"
  | "scan_completed"
  | "incident_created"
  | "incident_resolved"
  | "incident_deleted"
  | "incident_assigned"
  | "ip_blocked"
  | "whitelist_added"
  | "whitelist_removed"
  | "intel_added"
  | "intel_removed"
  | "user_role_changed"
  | "user_status_changed"
  | "user_invited"
  | "user_deactivated"
  | "api_key_generated"
  | "api_key_revoked"
  | "login"
  | "logout"
  | "profile_updated"
  | "deep_scan_triggered"
  | "ai_heuristic_analysis"
  | "port_patrol_scan"
  | "siem_push"
  | "weekly_digest_sent";

export interface AuditEntry {
  action: AuditAction;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
}

export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .single();

    const safeDetails = redactSensitive(entry.details || undefined) || null;

    await supabase.from("audit_logs").insert([
      {
        user_id: user.id,
        user_email: user.email,
        user_role: profile?.role || "unknown",
        action: entry.action,
        resource_type: entry.resource_type || null,
        resource_id: entry.resource_id || null,
        details: safeDetails,
        ip_address: entry.ip_address || null,
      },
    ]);
  } catch (err) {
    // Never crash the main flow for audit logging
    console.error("[AuditLogger] Failed to log event:", err);
  }
}
