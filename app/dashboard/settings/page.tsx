import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsClient from "./SettingsClient";

export default async function PlatformSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <SettingsClient
      userId={user.id}
      userEmail={user.email ?? ""}
      initialFullName={(profile?.full_name as string | null) ?? ""}
      initialAvatarUrl={(profile?.avatar_url as string | null) ?? null}
    />
  );
}
