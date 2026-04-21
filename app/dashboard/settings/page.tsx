import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import SettingsClient from "./SettingsClient";

export default async function PlatformSettingsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, email")
    .eq("id", userId)
    .maybeSingle();

  return (
    <SettingsClient
      userId={userId}
      userEmail={(profile?.email as string | null) ?? ""}
      initialFullName={(profile?.full_name as string | null) ?? ""}
      initialAvatarUrl={(profile?.avatar_url as string | null) ?? null}
    />
  );
}
