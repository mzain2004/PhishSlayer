"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { logAuditEvent } from "@/lib/audit/auditLogger";

// IMPORTANT: Before this works you must:
// 1. Go to Supabase Dashboard -> Storage -> Create bucket
//    Name: avatars, Public: true
// 2. Run in SQL editor:
//    ALTER TABLE public.profiles
//      ADD COLUMN IF NOT EXISTS avatar_url TEXT;

// ─── Email / Password ────────────────────────────────────────────

export async function signInWithEmail(formData: {
  email: string;
  password: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    return { error: error.message };
  }

  await logAuditEvent({ action: "login", details: { method: "email" } });

  redirect("/dashboard");
}

export async function signUpWithEmail(formData: {
  email: string;
  password: string;
  fullName?: string;
  orgName?: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        full_name: formData.fullName || "",
        org_name: formData.orgName || "",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Supabase sends a confirmation email by default.
  return { success: "Check your email to confirm your account." };
}

// ─── Social / OAuth ──────────────────────────────────────────────

export async function signInWithSocial(provider: "google" | "github") {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") || "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data?.url) {
    redirect(data.url);
  }

  return { error: "Could not initiate OAuth flow." };
}

// ─── Get Current User ────────────────────────────────────────────

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, role, department, phone_number, email, api_key, notify_email, notify_critical, notify_assignments, notify_digest",
    )
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email || "",
    fullName: profile?.display_name || "",
    phone: profile?.phone_number || "",
    department: profile?.department || "Security Operations",
    avatarUrl: profile?.avatar_url || null,
    role: profile?.role || "analyst",
    apiKey: profile?.api_key || null,
    // Notification prefs
    notifyEmail: profile?.notify_email ?? true,
    notifyCritical: profile?.notify_critical ?? true,
    notifyAssignments: profile?.notify_assignments ?? true,
    notifyDigest: profile?.notify_digest ?? false,

    // Legacy settings prefs from metadata
    orgName: (user.user_metadata?.org_name as string) || "",
    twoFactor: user.user_metadata?.two_factor !== false,
    sessionTimeout: user.user_metadata?.session_timeout === true,
    ipWhitelisting: user.user_metadata?.ip_whitelisting === true,
    supportEmail: (user.user_metadata?.support_email as string) || "",
  };
}

// ─── Update Profile ──────────────────────────────────────────────

export async function updateProfile(data: {
  fullName: string;
  phone: string;
  department: string;
  notifyEmail?: boolean;
  notifyCritical?: boolean;
  notifyAssignments?: boolean;
  notifyDigest?: boolean;
  avatarUrl?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Update Profiles table for RBAC/Global use
  const profileUpdate: any = {
    display_name: data.fullName,
    phone_number: data.phone,
    department: data.department,
    updated_at: new Date().toISOString(),
  };

  if (data.notifyEmail !== undefined)
    profileUpdate.notify_email = data.notifyEmail;
  if (data.notifyCritical !== undefined)
    profileUpdate.notify_critical = data.notifyCritical;
  if (data.notifyAssignments !== undefined)
    profileUpdate.notify_assignments = data.notifyAssignments;
  if (data.notifyDigest !== undefined)
    profileUpdate.notify_digest = data.notifyDigest;

  if (data.avatarUrl !== undefined) {
    profileUpdate.avatar_url = data.avatarUrl;
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  let dbError;
  if (existing) {
    const { error } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", user.id);
    dbError = error;
  } else {
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      ...profileUpdate,
    });
    dbError = error;
  }

  if (dbError)
    return {
      error: "Failed to sync with profile database: " + dbError.message,
    };

  await logAuditEvent({
    action: "profile_updated",
    details: { fields: Object.keys(profileUpdate) },
  });

  return { success: "Profile updated successfully." };
}

// ─── Update Notifications ────────────────────────────────────────

export async function updateNotifications(data: {
  notifyEmail: boolean;
  notifyCritical: boolean;
  notifyAssignments: boolean;
  notifyDigest: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({
      notify_email: data.notifyEmail,
      notify_critical: data.notifyCritical,
      notify_assignments: data.notifyAssignments,
      notify_digest: data.notifyDigest,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  await logAuditEvent({
    action: "profile_updated",
    details: { type: "notifications" },
  });

  return { success: "Notification preferences saved." };
}

// ─── Update Password ─────────────────────────────────────────────

export async function updatePassword(password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  await logAuditEvent({
    action: "profile_updated",
    details: { type: "password_change" },
  });

  return { success: "Password updated successfully." };
}

// ─── Upload Avatar ───────────────────────────────────────────────

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated" };

  const file = formData.get("avatar") as File | null;
  if (!file) return { error: "No file provided" };

  const fileNameParts = file.name.split(".");
  const fileExtension =
    fileNameParts.length > 1 ? fileNameParts.pop()!.toLowerCase() : "png";
  const path = `avatars/${user.id}/avatar.${fileExtension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

  const avatarUrl = urlData.publicUrl;

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (profileUpdateError) return { error: profileUpdateError.message };

  const { error: updateError } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  });

  if (updateError) return { error: updateError.message };

  return { success: "Avatar uploaded.", avatarUrl };
}

// ─── Update Settings ─────────────────────────────────────────────

export async function updateSettings(data: {
  orgName: string;
  supportEmail: string;
  twoFactor: boolean;
  sessionTimeout: boolean;
  ipWhitelisting: boolean;
}) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    data: {
      org_name: data.orgName,
      support_email: data.supportEmail,
      two_factor: data.twoFactor,
      session_timeout: data.sessionTimeout,
      ip_whitelisting: data.ipWhitelisting,
    },
  });

  if (error) return { error: error.message };
  return { success: "Settings saved successfully." };
}

// ─── API Keys ──────────────────────────────────────────────

export async function generateApiKey() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const newKey = "pk_live_" + crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase
    .from("profiles")
    .update({ api_key: newKey })
    .eq("id", user.id);

  if (error) return { error: error.message };

  await logAuditEvent({
    action: "api_key_generated",
    resource_type: "apiKey",
    resource_id: user.id,
  });
  return { success: true, key: newKey };
}

export async function revokeApiKey() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ api_key: null })
    .eq("id", user.id);

  if (error) return { error: error.message };

  await logAuditEvent({
    action: "api_key_revoked",
    resource_type: "apiKey",
    resource_id: user.id,
  });
  return { success: true };
}
