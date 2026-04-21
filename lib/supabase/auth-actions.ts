"use server";

import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { logAuditEvent } from "@/lib/audit/auditLogger";
import { hash as bcryptHash } from "bcryptjs";

// ─── NOTE: Supabase Auth methods removed ─────────────────────────────────────
// signInWithEmail, signUpWithEmail, signInWithSocial, updatePassword, updateSettings
// are now handled by Clerk's built-in UI components (SignIn, SignUp, UserButton).
// Password resets, 2FA, passkeys, MFA — all managed by Clerk.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Get Current User ────────────────────────────────────────────

export async function getUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, role, department, phone_number, email, api_key_last4, notify_email, notify_critical, notify_assignments, notify_digest",
    )
    .eq("id", userId)
    .single();

  return {
    id: userId,
    email: profile?.email || "",
    fullName: profile?.display_name || "",
    phone: profile?.phone_number || "",
    department: profile?.department || "Security Operations",
    avatarUrl: profile?.avatar_url || null,
    role: profile?.role || "analyst",
    apiKeyLast4: profile?.api_key_last4 || null,
    // Notification prefs
    notifyEmail: profile?.notify_email ?? true,
    notifyCritical: profile?.notify_critical ?? true,
    notifyAssignments: profile?.notify_assignments ?? true,
    notifyDigest: profile?.notify_digest ?? false,
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
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const supabase = await createClient();

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
    .eq("id", userId)
    .single();

  let dbError;
  if (existing) {
    const { error } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", userId);
    dbError = error;
  } else {
    const { error } = await supabase.from("profiles").insert({
      id: userId,
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
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      notify_email: data.notifyEmail,
      notify_critical: data.notifyCritical,
      notify_assignments: data.notifyAssignments,
      notify_digest: data.notifyDigest,
    })
    .eq("id", userId);

  if (error) return { error: error.message };

  await logAuditEvent({
    action: "profile_updated",
    details: { type: "notifications" },
  });

  return { success: "Notification preferences saved." };
}

// ─── Upload Avatar ───────────────────────────────────────────────

export async function uploadAvatar(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const supabase = await createClient();

  const file = formData.get("avatar") as File | null;
  if (!file) return { error: "No file provided" };

  const allowedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ]);
  const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
  const maxSizeBytes = 5 * 1024 * 1024;

  if (!allowedMimeTypes.has(file.type)) {
    return { error: "Unsupported file type", status: 400 };
  }
  if (file.size > maxSizeBytes) {
    return { error: "File exceeds 5MB limit", status: 400 };
  }

  const nameLower = file.name.toLowerCase();
  const lastDot = nameLower.lastIndexOf(".");
  const extension = lastDot >= 0 ? nameLower.slice(lastDot) : "";
  if (!allowedExtensions.has(extension)) {
    return { error: "Unsupported file extension", status: 400 };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const magicMime = (() => {
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return "image/jpeg";
    }
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return "image/png";
    }
    if (
      buffer.length >= 6 &&
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38 &&
      (buffer[4] === 0x37 || buffer[4] === 0x39) &&
      buffer[5] === 0x61
    ) {
      return "image/gif";
    }
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return "image/webp";
    }
    return null;
  })();

  if (!magicMime || !allowedMimeTypes.has(magicMime)) {
    return { error: "Invalid image file", status: 400 };
  }
  if (file.type && magicMime !== file.type) {
    return { error: "File content does not match type", status: 400 };
  }

  const fileExtension = extension.replace(".", "");
  const path = `avatars/${userId}/avatar.${fileExtension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

  const avatarUrl = urlData.publicUrl;

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);

  if (profileUpdateError) return { error: profileUpdateError.message };

  return { success: "Avatar uploaded.", avatarUrl };
}

// ─── API Keys ──────────────────────────────────────────────

export async function generateApiKey() {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const supabase = await createClient();
  const newKey = "pk_live_" + crypto.randomUUID().replace(/-/g, "");
  const apiKeyHash = await bcryptHash(newKey, 12);
  const apiKeyLast4 = newKey.slice(-4);
  const { error } = await supabase
    .from("profiles")
    .update({ api_key: apiKeyHash, api_key_last4: apiKeyLast4 })
    .eq("id", userId);

  if (error) return { error: error.message };

  await logAuditEvent({
    action: "api_key_generated",
    resource_type: "apiKey",
    resource_id: userId,
  });
  return { success: true, key: newKey };
}

export async function revokeApiKey() {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ api_key: null, api_key_last4: null })
    .eq("id", userId);

  if (error) return { error: error.message };

  await logAuditEvent({
    action: "api_key_revoked",
    resource_type: "apiKey",
    resource_id: userId,
  });
  return { success: true };
}
