"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { analyzeThreat, scoreCtiFinding } from "@/lib/ai/analyzer";
import { scanTarget } from "@/lib/scanners/threatScanner";
import { logAuditEvent } from "@/lib/security/audit";
import {
  getTierLimits,
  canPerformScan,
  type Tier,
} from "@/lib/rbac/tierLimits";
import { normalizeTarget, scanTargetSchema } from "@/lib/security/sanitize";
import {
  sendCriticalThreatAlert,
  sendIncidentAssignmentEmail,
  sendWeeklyDigest,
} from "@/lib/email/emailService";
import { z } from "zod";
import { canAccessFeature, type SubscriptionTier } from "@/lib/rbac/planGating";

// ── Discord Webhook Alert (fire-and-forget) ───────────────────────────
async function fireDiscordAlert(scan: {
  target: string;
  threat_category: string;
  risk_score: number;
  ai_summary: string;
}) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return; // Silently skip if not configured

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "🚨 Malicious Threat Detected",
            color: 16711680, // Red
            fields: [
              { name: "Target", value: `\`${scan.target}\``, inline: true },
              { name: "Category", value: scan.threat_category, inline: true },
              {
                name: "Risk Score",
                value: `${scan.risk_score}/100`,
                inline: true,
              },
              { name: "AI Summary", value: scan.ai_summary.slice(0, 1024) },
            ],
            footer: { text: "Phish-Slayer Command Center" },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (err) {
    // Never crash the scan pipeline — log and move on
    console.error("Discord webhook failed (non-fatal):", err);
  }
}

// Zod Schemas for payload validation
const createIncidentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255),
  severity: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  status: z.string().trim().optional(),
  assignee: z.string().trim().optional(),
  description: z.string().trim().optional(),
  timeline: z.array(z.any()).optional(),
});

const resolveIncidentSchema = z.object({
  id: z.string().trim().min(1, "Incident ID is required"),
  comment: z
    .string()
    .trim()
    .min(1, "Resolution comment is required")
    .max(1000, "Comment too long"),
});

const deleteIncidentSchema = z.object({
  id: z.string().trim().min(1, "Incident ID is required"),
});

const blockIpSchema = z.object({
  ipAddress: z.string().trim().min(1, "Indicator is required."),
});

const addToWhitelistSchema = z.object({
  target: z.string().trim().min(3, "Target is required."),
});

const launchScanSchema = z.object({
  target: z
    .string()
    .trim()
    .min(3)
    .refine(
      (val) => {
        const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(val);
        const isDomain =
          /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(
            val,
          );
        return isIp || isDomain;
      },
      {
        message:
          "Invalid target format detected. Must be an IP address or domain.",
      },
    ),
});
export async function getIncidents() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data, error } = await supabase.from("incidents").select("*");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getScans() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createIncident(data: any) {
  // Validate armor
  const parsed = createIncidentSchema.safeParse(data);
  if (!parsed.success) {
    const errorMessage =
      parsed.error.issues?.[0]?.message || "Invalid incident payload";
    return { error: errorMessage };
  }
  const validData = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload: any = {
    title: validData.title,
    severity: validData.severity || validData.priority || "Medium",
    status: validData.status || "open",
    assignee: validData.assignee || "Unassigned",
    description: validData.description || "",
    timeline: validData.timeline || [],
    created_by: user?.id || null,
  };

  if (payload.description) {
    try {
      const aiData = await analyzeThreat(payload.description);
      if (aiData) {
        payload.risk_score = aiData.risk_score;
        payload.threat_category = aiData.threat_category;
        payload.remediation_steps = aiData.remediation_steps;
      }
    } catch (err: any) {
      console.error("Failed to analyze threat with AI:", err);
    }
  }

  const { error } = await supabase.from("incidents").insert([payload]);

  if (error) {
    console.error("SUPABASE INSERT ERROR (createIncident):", error);
    return { error: error.message || "Failed to create incident" };
  }

  await logAuditEvent(user?.id || "system", "incident_created", payload.title, {
    severity: payload.severity,
  });

  revalidatePath("/dashboard/incidents");
  return { success: true };
}

export async function resolveIncident(id: string, comment: string) {
  // Validate armor
  const parsed = resolveIncidentSchema.safeParse({ id, comment });
  if (!parsed.success) {
    const errorMessage =
      parsed.error.issues?.[0]?.message || "Invalid resolution payload";
    throw new Error(errorMessage);
  }
  const validId = parsed.data.id;
  const validComment = parsed.data.comment;

  const supabase = await createClient();

  // Fetch current incident to append to timeline
  const { data: incident, error: fetchError } = await supabase
    .from("incidents")
    .select("timeline")
    .eq("id", validId)
    .single();

  if (fetchError) {
    console.error("SUPABASE FETCH ERROR (resolveIncident):", fetchError);
    throw new Error(fetchError.message || "Failed to fetch incident");
  }

  const now = new Date().toLocaleTimeString("en-US", { hour12: false });
  const newTimelineEvent = {
    id: (incident?.timeline?.length || 0) + 1,
    type: "resolved",
    title: "Resolved",
    time: now,
    notes: validComment,
  };

  const newTimeline = [...(incident?.timeline || []), newTimelineEvent];

  const { error: updateError } = await supabase
    .from("incidents")
    .update({
      status: "resolved",
      timeline: newTimeline,
    })
    .eq("id", validId);

  if (updateError) {
    console.error("SUPABASE UPDATE ERROR (resolveIncident):", updateError);
    throw new Error(updateError.message || "Failed to resolve incident");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logAuditEvent(user?.id || "system", "incident_resolved", validId, {
    comment: validComment,
  });

  revalidatePath("/dashboard");
}

export async function deleteIncident(id: string) {
  // Validate armor
  const parsed = deleteIncidentSchema.safeParse({ id });
  if (!parsed.success) {
    const errorMessage =
      parsed.error.issues?.[0]?.message || "Invalid incident ID";
    throw new Error(errorMessage);
  }
  const validId = parsed.data.id;

  const supabase = await createClient();
  const { error } = await supabase.from("incidents").delete().eq("id", validId);

  if (error) {
    console.error("SUPABASE DELETE ERROR (deleteIncident):", error);
    throw new Error(error.message || "Failed to delete incident");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logAuditEvent(user?.id || "system", "incident_deleted", validId);

  revalidatePath("/dashboard");
}

export async function blockIp(ipAddress: string) {
  // Validate armor
  const parsed = blockIpSchema.safeParse({ ipAddress });
  if (!parsed.success) {
    const errorMessage =
      parsed.error.issues?.[0]?.message || "Invalid IP address detected";
    throw new Error(errorMessage);
  }
  const validIp = parsed.data.ipAddress;

  const supabase = await createClient();

  // Determine type based on IP regex
  const isIp = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(validIp);

  // Upsert into proprietary_intel (handles duplicates gracefully)
  const { data, error } = await supabase
    .from("proprietary_intel")
    .upsert(
      [
        {
          indicator: validIp,
          type: isIp ? "ipv4" : "domain",
          severity: "critical",
          source: "Manual Administrative Block",
        },
      ],
      { onConflict: "indicator" },
    )
    .select();

  if (error) {
    console.error("SUPABASE UPSERT ERROR (blockIp):", JSON.stringify(error));
    throw new Error(error.message || "Failed to block IP");
  }

  // Siren: Discord notification for manual blocks
  fireDiscordAlert({
    target: validIp,
    threat_category: "Manual Administrative Block",
    risk_score: 100,
    ai_summary: `Manual block executed by administrator. Indicator: ${validIp} (${isIp ? "IPv4" : "Domain"}) added to the proprietary intel vault with CRITICAL severity.`,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logAuditEvent(user?.id || "system", "ip_blocked", validIp, {
    source: "Manual Administrative Block",
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/intel");
  revalidatePath("/dashboard/incidents");
}

export async function addToWhitelist(target: string) {
  // Validate armor
  const parsed = addToWhitelistSchema.safeParse({ target });
  if (!parsed.success) {
    const errorMessage =
      parsed.error.issues?.[0]?.message ||
      "Invalid target format detected for whitelist.";
    return { error: errorMessage };
  }
  const validTarget = parsed.data.target;

  const supabase = await createClient();

  const { error } = await supabase
    .from("whitelist")
    .insert([{ target: validTarget }]);

  if (error) {
    console.error("SUPABASE INSERT ERROR (addToWhitelist):", error);
    return { error: error.message || "Failed to add target to whitelist" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logAuditEvent(user?.id || "system", "whitelist_added", validTarget);

  revalidatePath("/dashboard/threats");
  return { success: true };
}

export async function getWhitelist() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data, error } = await supabase
    .from("whitelist")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) console.error("SUPABASE FETCH ERROR (getWhitelist):", error);
  return data || [];
}

const removeFromWhitelistSchema = z.object({
  id: z.coerce.number().min(1, "Target ID is required"),
});

export async function removeFromWhitelist(id: string) {
  const parsed = removeFromWhitelistSchema.safeParse({ id });
  if (!parsed.success) {
    throw new Error(parsed.error.issues?.[0]?.message || "Invalid target ID");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("whitelist")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    console.error("SUPABASE DELETE ERROR (removeFromWhitelist):", error);
    throw new Error(error.message || "Failed to remove from whitelist");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logAuditEvent(
    user?.id || "system",
    "whitelist_removed",
    parsed.data.id.toString(),
  );

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/threats");
  revalidatePath("/dashboard/intel");
}

export async function launchScan(target: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;
  if (!userId) return { error: "Unauthorized" };

  // 1. Validate and normalize target
  const parseResult = scanTargetSchema.safeParse(target);
  if (!parseResult.success) {
    return {
      error: "Invalid scan target: " + parseResult.error.issues[0].message,
    };
  }
  const normalizedTarget = normalizeTarget(target);

  // 2. Fetch profile for RBAC
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, scan_count_today, scan_count_reset_at, role")
    .eq("id", userId)
    .single();

  if (!profile) return { error: "Profile not found" };

  // 3. Reset daily counter if new day
  const resetAt = new Date(profile.scan_count_reset_at);
  const now = new Date();
  if (now.toDateString() !== resetAt.toDateString()) {
    await supabase
      .from("profiles")
      .update({
        scan_count_today: 0,
        scan_count_reset_at: now.toISOString(),
      })
      .eq("id", userId);
    profile.scan_count_today = 0;
  }

  // 4. Enforce scan limit (super_admin bypasses)
  if (profile.role !== "super_admin") {
    const tier = (profile.subscription_tier as Tier) ?? "recon";
    const limits = getTierLimits(tier);
    if (!canPerformScan(tier, profile.scan_count_today || 0)) {
      return {
        error: `Daily scan limit reached. Your ${tier} plan allows ${limits.scansPerDay} scans/day. Upgrade to scan more.`,
      };
    }
  }

  // 5. Increment scan counter
  const { error: incrementError } = await supabase.rpc(
    "increment_scan_count",
    { user_id: userId },
  );
  if (incrementError) {
    return { error: "Failed to increment scan count" };
  }

  // 7. Log audit event
  await logAuditEvent(userId, "scan_launched", normalizedTarget, {
    tier: profile.subscription_tier,
  });

  const date = new Date().toISOString();
  const validTarget = normalizedTarget;

  // ── Gate 1: Whitelist Check (instant Safe) ──────────────────────────
  const { data: whitelistHit } = await supabase
    .from("whitelist")
    .select("id, target")
    .or(`target.eq.${validTarget},target.eq.www.${validTarget}`)
    .maybeSingle();

  if (whitelistHit) {
    const { error: wlInsertError } = await supabase.from("scans").insert([
      {
        target: validTarget,
          status: "completed",
        date,
        verdict: "clean",
        malicious_count: 0,
        total_engines: 0,
        ai_summary: `Target cleared — matched against the organization whitelist. No external scan was performed.`,
        risk_score: 0,
        threat_category: "Whitelisted",
        payload: whitelistHit,
        user_id: user?.id || null,
      },
    ]);

    if (wlInsertError) {
      console.error(
        "Failed to insert whitelist-matched scan:",
        wlInsertError.message,
      );
      return { error: "Target is whitelisted but failed to record scan." };
    }

    await logAuditEvent(userId, "scan_completed", validTarget, {
      verdict: "clean",
      reason: "whitelist_hit",
    });
    revalidatePath("/dashboard/scans");
    return {};
  }

  // ── Gate 2: Proprietary Intel Vault Check (instant Critical Threat) ─
  const { data: intelHit } = await supabase
    .from("proprietary_intel")
    .select("*")
    .or(`indicator.eq.${validTarget},indicator.eq.www.${validTarget}`)
    .maybeSingle();

  if (intelHit) {
    const { error: intelInsertError } = await supabase.from("scans").insert([
      {
        target: validTarget,
          status: "completed",
        date,
        verdict: "malicious",
        malicious_count: 1,
        total_engines: 1,
        ai_summary: `CRITICAL THREAT — Identified via Proprietary Local Intel. Severity: ${intelHit.severity?.toUpperCase() || "HIGH"}. Source: ${intelHit.source || "Internal Database"}. This indicator was matched against our private threat intelligence vault before any external queries were made.`,
        risk_score: 100,
        threat_category: "Proprietary Local Intel",
        payload: intelHit,
        user_id: user?.id || null,
      },
    ]);

    if (intelInsertError) {
      console.error(
        "Failed to insert intel-matched scan:",
        intelInsertError.message,
      );
      return { error: "Threat identified but failed to record scan." };
    }

    revalidatePath("/dashboard/scans");

    // ── Siren: Discord Webhook for Intel Hit ──
    fireDiscordAlert({
      target: validTarget,
      threat_category: "Proprietary Local Intel",
      risk_score: 100,
      ai_summary: `CRITICAL THREAT — Identified via Proprietary Local Intel. Severity: ${intelHit.severity?.toUpperCase() || "HIGH"}. Source: ${intelHit.source || "Internal Database"}.`,
    });

    // Email Notification
    const serviceClient = getServiceSupabase();
    if (serviceClient) {
      const { data: admins } = await serviceClient
        .from("profiles")
        .select("id")
        .in("role", ["super_admin", "manager"])
        .eq("notify_critical", true)
        .eq("is_active", true);
      if (admins && admins.length > 0) {
        const adminEmails: string[] = [];
        for (const admin of admins) {
          const {
            data: { user: adminUser },
          } = await serviceClient.auth.admin.getUserById(admin.id);
          if (adminUser?.email) adminEmails.push(adminUser.email);
        }
        if (adminEmails.length > 0) {
          await sendCriticalThreatAlert({
            target: validTarget,
            threatCategory: "Proprietary Local Intel",
            riskScore: 100,
            aiSummary: "Critical internal threat intel rule triggered.",
            recipients: adminEmails,
          });
        }
      }
    }

    await logAuditEvent(userId, "scan_completed", validTarget, {
      verdict: "malicious",
      reason: "intel_hit",
    });
    return {};
  }

  // ── Gate 3: External Scan (VirusTotal → Gemini) ─────────────────────
  try {
    // Step 1: Call VirusTotal
    const finding = await scanTarget(validTarget);

    // Step 2: Call Gemini ONLY if user has AI Heuristics feature
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user?.id || "")
      .single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || "free";
    const hasAi = canAccessFeature(tier, "aiHeuristics");

    let aiData = null;
    if (hasAi) {
      aiData = await scoreCtiFinding(finding.summary);
    } else {
      // Fallback for Free Tier
      const baseRisk =
        finding.verdict === "malicious"
          ? 70
          : finding.verdict === "suspicious"
            ? 40
            : 0;
      aiData = {
        ai_summary:
          "AI Analysis Locked — Upgrade to SOC Pro or Command & Control to unlock deep-dive Gemini heuristics.",
        risk_score: baseRisk,
        threat_category:
          finding.verdict === "malicious" ? "Verified Threat" : "N/A",
      };
    }

    // Step 3: Single INSERT — Completed
    const { error } = await supabase.from("scans").insert([
      {
        target: validTarget,
        status: "completed",
        date,
        verdict: finding.verdict,
        malicious_count: finding.maliciousCount,
        total_engines: finding.totalEngines,
        ai_summary: aiData?.ai_summary || "Analysis currently unavailable.",
        risk_score: aiData?.risk_score || 0,
        threat_category: aiData?.threat_category || "Unknown",
        payload: finding,
        user_id: user?.id || null,
      },
    ]);

    if (error) throw new Error(error.message);

    // ── Siren: Discord Webhook for External Malicious Scan ──
    if (finding.verdict === "malicious") {
      fireDiscordAlert({
        target: validTarget,
        threat_category: aiData?.threat_category || "Unknown",
        risk_score: aiData?.risk_score || 0,
        ai_summary:
          aiData?.ai_summary || "Malicious target detected via VirusTotal.",
      });

      // Email Notification
      const risk = aiData?.risk_score || 0;
      if (risk >= 80) {
        const serviceClient = getServiceSupabase();
        if (serviceClient) {
          const { data: admins } = await serviceClient
            .from("profiles")
            .select("id")
            .in("role", ["super_admin", "manager"])
            .eq("notify_critical", true)
            .eq("is_active", true);
          if (admins && admins.length > 0) {
            const adminEmails: string[] = [];
            for (const admin of admins) {
              const {
                data: { user: adminUser },
              } = await serviceClient.auth.admin.getUserById(admin.id);
              if (adminUser?.email) adminEmails.push(adminUser.email);
            }
            if (adminEmails.length > 0) {
              await sendCriticalThreatAlert({
                target: validTarget,
                threatCategory: aiData?.threat_category || "Unknown",
                riskScore: risk,
                aiSummary: aiData?.ai_summary || "Malicious target detected.",
                recipients: adminEmails,
              });
            }
          }
        }
      }
    }
  } catch (err: any) {
    if (err?.message === "RATE_LIMIT") {
      // Surface gracefully — no DB write needed
      return {
        error:
          "Rate limit exceeded. Please wait 60 seconds before launching another scan.",
      };
    }

    console.error("launchScan error:", err);

    // Single INSERT — Failed (fire and forget, don't re-throw)
    const failPayload = {
      target: validTarget,
      status: "failed",
      date,
      user_id: user?.id || null,
    };
    const { error: failError } = await supabase
      .from("scans")
      .insert([failPayload]);
    if (failError)
      console.error("Failed to insert Failed scan row:", failError.message);

    return { error: err?.message || "Scan failed due to an unexpected error." };
  }

  await logAuditEvent(userId, "scan_completed", validTarget, {
    verdict: "scanned natively",
  });
  revalidatePath("/dashboard/scans");
  return {};
}

// ── Intel Vault Management ─────────────────────────────────────────────

export async function getIntelIndicators() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data, error } = await supabase
    .from("proprietary_intel")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) console.error("SUPABASE FETCH ERROR (getIntelIndicators):", error);
  return data || [];
}

const removeIntelIndicatorSchema = z.object({
  id: z.coerce.string().trim().min(1, "Indicator ID is required"),
});

export async function removeIntelIndicator(id: string) {
  const parsed = removeIntelIndicatorSchema.safeParse({ id });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues?.[0]?.message || "Invalid indicator ID",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("proprietary_intel")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    console.error("SUPABASE DELETE ERROR (removeIntelIndicator):", error);
    throw new Error(error.message || "Failed to remove indicator");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logAuditEvent(user?.id || "system", "intel_removed", parsed.data.id);

  revalidatePath("/dashboard/intel");
  revalidatePath("/dashboard/settings");
}

// ── RBAC Utils & Actions ─────────────────────────────────────────────

import { getServerRole } from "@/lib/rbac/serverRole";
import {
  canAssignIncidents,
  canManageUsers,
  type UserRole,
} from "@/lib/rbac/roles";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Helper for service role client (bypasses RLS)
function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function assignIncident(
  incidentId: string,
  assignToUserId: string,
) {
  const role = await getServerRole();
  if (!role || !canAssignIncidents(role)) {
    return {
      error: "Unauthorized: insufficient permissions to assign incidents",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("incidents")
    .update({ assigned_to: assignToUserId })
    .eq("id", incidentId);

  if (error) return { error: error.message };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logAuditEvent(user?.id || "system", "incident_assigned", incidentId, {
    assigned_to: assignToUserId,
  });

  // Fetch incident details to send email
  const serviceClient = getServiceSupabase();
  if (serviceClient) {
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("notify_assignments")
      .eq("id", assignToUserId)
      .single();
    if (profile?.notify_assignments) {
      const { data: incident } = await supabase
        .from("incidents")
        .select("title")
        .eq("id", incidentId)
        .single();
      const {
        data: { user: assigneUser },
      } = await serviceClient.auth.admin.getUserById(assignToUserId);
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", currentUser?.id || "")
        .single();

      if (assigneUser?.email && incident) {
        await sendIncidentAssignmentEmail({
          incidentId,
          incidentTitle: incident.title,
          assignerName:
            currentProfile?.display_name || currentUser?.email || "A Manager",
          recipientEmail: assigneUser.email,
        });
      }
    }
  }

  revalidatePath("/dashboard/incidents");
  return { success: true };
}

export async function getOrgUsers() {
  try {
    const role = await getServerRole();
    if (!role || !canManageUsers(role)) {
      return { users: [], error: "Unauthorized" };
    }

    const supabaseAdmin = getServiceSupabase();
    if (!supabaseAdmin)
      return { users: [], error: "Service role key not configured." };

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.listUsers();
    if (authError) return { users: [], error: authError.message };

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, display_name, department, is_active, updated_at");

    if (profileError) return { users: [], error: profileError.message };

    const merged = authData.users.map((u) => {
      const profile = profiles?.find((p) => p.id === u.id);
      return {
        id: u.id,
        email: u.email,
        display_name:
          profile?.display_name || u.email?.split("@")[0] || "Unknown User",
        role: profile?.role || "analyst",
        department: profile?.department || "—",
        is_active: profile?.is_active ?? true,
        last_active: u.last_sign_in_at,
      };
    });

    return { users: merged, error: null };
  } catch (err: any) {
    return { users: [], error: err.message || "Failed to fetch users" };
  }
}

export async function updateUserRole(userId: string, newRole: UserRole) {
  const role = await getServerRole();
  if (!role || !canManageUsers(role)) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) {
    return { error: "You cannot change your own role" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) return { error: error.message };
  await logAuditEvent(user?.id || "system", "user_role_changed", userId, {
    new_role: newRole,
  });

  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
  const role = await getServerRole();
  if (!role || !canManageUsers(role)) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) {
    return { error: "You cannot deactivate yourself" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) return { error: error.message };
  await logAuditEvent(user?.id || "system", "user_status_changed", userId, {
    is_active: isActive,
  });

  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function inviteOrgUser(email: string, roleAssignment: UserRole) {
  const role = await getServerRole();
  if (!role || !canManageUsers(role)) {
    return { error: "Unauthorized" };
  }

  const serviceClient = getServiceSupabase();
  if (!serviceClient) {
    return { error: "Service role key not configured. Cannot invite users." };
  }

  // Quick check if email is already registered in Auth (sometimes inviteUserByEmail throws obscure errors)
  const { data: existingProfiles } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("email", email);
  if (existingProfiles && existingProfiles.length > 0) {
    return { error: "Email is already registered." };
  }

  // Invite user via auth.admin
  const { data: inviteData, error: inviteError } =
    await serviceClient.auth.admin.inviteUserByEmail(email, {
      data: { role: roleAssignment },
    });

  if (inviteError) {
    if (inviteError.message.includes("already registered")) {
      return { error: "Email is already registered." };
    }
    return { error: inviteError.message };
  }

  if (inviteData.user) {
    // Upsert the profile with the selected role immediately
    const { error: profileError } = await serviceClient.from("profiles").upsert(
      {
        id: inviteData.user.id,
        role: roleAssignment,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      console.error("Failed to upsert role for invited user:", profileError);
      return { error: "Database error saving new user profile." };
    }
  }

  await logAuditEvent("system", "user_invited", email, {
    role: roleAssignment,
  });

  revalidatePath("/dashboard/admin");
  return { success: true };
}

// ── Weekly Digest Trigger ───────────────────────────────────────────

const supportTicketSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required"),
  category: z.string().trim().min(1, "Category is required"),
  priority: z.string().trim().min(1, "Priority is required"),
  message: z.string().trim().min(1, "Message is required"),
});

export async function submitSupportTicket(payload: {
  subject: string;
  category: string;
  priority: string;
  message: string;
}) {
  const parsed = supportTicketSchema.safeParse(payload);
  if (!parsed.success) return { error: "Invalid ticket payload" };
  const d = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("support_tickets").insert([
    {
      user_id: user.id,
      subject: d.subject,
      category: d.category,
      priority: d.priority,
      message: d.message,
      status: "open",
    },
  ]);

  if (error) {
    console.error("Support ticket insert error:", error);
    return { error: "Database error saving ticket" };
  }

  // Fire Discord Webhook
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "🎫 New Support Ticket",
              color: d.priority === "Critical" ? 16711680 : 3447003, // Red or Blue
              fields: [
                { name: "Subject", value: d.subject, inline: true },
                { name: "Priority", value: d.priority, inline: true },
                { name: "User", value: user.email || "Unknown", inline: false },
                {
                  name: "Message",
                  value: d.message.slice(0, 1024),
                  inline: false,
                },
              ],
              footer: { text: "Phish-Slayer Support System" },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    } catch (err) {
      console.error("Discord webhook failed for ticket:", err);
    }
  }

  return { success: true };
}
export async function triggerWeeklyDigest() {
  const role = await getServerRole();
  if (!role || !canManageUsers(role)) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();
  const serviceClient = getServiceSupabase();
  if (!serviceClient) return { error: "Service client not configured" };

  // Gather stats
  const { count: totalScans } = await supabase
    .from("scans")
    .select("*", { count: "exact", head: true });
  const { count: maliciousFound } = await supabase
    .from("scans")
    .select("*", { count: "exact", head: true })
    .eq("verdict", "malicious");
  const { count: openIncidents } = await supabase
    .from("incidents")
    .select("*", { count: "exact", head: true })
    .neq("status", "resolved");

  // Get users who want the digest
  const { data: subscribers } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("notify_digest", true)
    .eq("is_active", true);

  if (!subscribers || subscribers.length === 0)
    return { success: true, message: "No subscribers for weekly digest." };

  const emails: string[] = [];
  for (const sub of subscribers) {
    const {
      data: { user },
    } = await serviceClient.auth.admin.getUserById(sub.id);
    if (user?.email) emails.push(user.email);
  }

  if (emails.length > 0) {
    await sendWeeklyDigest({
      totalScans: totalScans || 0,
      maliciousFound: maliciousFound || 0,
      openIncidents: openIncidents || 0,
      recipients: emails,
    });
  }

  await logAuditEvent("system", "profile_updated", "weekly_digest", {
    sent_to_count: emails.length,
  });

  return { success: true, sentCount: emails.length };
}

// ── Billing placeholder (was Stripe) ───────────────────────────────────────────────
// Payments moved to Polar.
// Use billing_customer_id for all gateway-neutral customer tracking.
