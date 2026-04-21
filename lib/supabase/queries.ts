import { createClient } from "./server";
import { auth } from "@clerk/nextjs/server";

export async function getUserProfile() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const supabase = await createClient();

  // Fetch the profile for this user
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, full_name, display_name, avatar_url, role, department, phone_number, email, notify_email, notify_critical, notify_assignments, notify_digest, created_at, updated_at",
    )
    .eq("id", userId)
    .single();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
    return {
      id: userId,
      email: null,
      full_name: "Unknown User",
      role: "User",
      avatar_url: null,
    };
  }

  return {
    ...profile,
  };
}
