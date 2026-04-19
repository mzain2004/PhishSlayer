import { createClient } from "./server";

export async function getUserProfile() {
  const supabase = await createClient();

  // Get the current session user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  // Fetch the profile for this user
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, full_name, display_name, avatar_url, role, department, phone_number, email, notify_email, notify_critical, notify_assignments, notify_digest, created_at, updated_at",
    )
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
    // If we only have an auth user but no profile row yet, return basic info
    return {
      id: user.id,
      email: user.email,
      full_name:
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Unknown User",
      role: user.user_metadata?.role || "User",
      avatar_url: user.user_metadata?.avatar_url || null,
    };
  }

  return {
    ...profile,
    email: user.email,
    avatar_url: user.user_metadata?.avatar_url || profile?.avatar_url || null,
    full_name:
      user.user_metadata?.full_name ||
      profile?.full_name ||
      user.email?.split("@")[0] ||
      "Unknown User",
  };
}
