"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Key, Loader2, Lock, Save, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  userEmail: string;
  initialFullName: string;
  initialApiKey: string | null;
};

function generateApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 40; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `psk_${suffix}`;
}

export default function SettingsClient({
  userId,
  userEmail,
  initialFullName,
  initialApiKey,
}: Props) {
  const supabase = createClient();
  const [profileName, setProfileName] = useState(initialFullName);
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  const saveProfile = () => {
    startTransition(async () => {
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: profileName,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Profile saved");
    });
  };

  const updatePassword = () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    });
  };

  const regenerateApiKey = () => {
    startTransition(async () => {
      const nextKey = generateApiKey();
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        api_key: nextKey,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        toast.error(error.message);
        return;
      }
      setApiKey(nextKey);
      toast.success("API key regenerated");
    });
  };

  return (
    <div className="flex flex-col gap-6 text-white">
      <header className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-3xl">
        <h1 className="text-3xl font-bold">Platform Settings</h1>
        <p className="mt-2 text-sm text-white/60">Manage profile information, account security, and API access.</p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-3xl">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <User className="h-5 w-5 text-[#2DD4BF]" /> Profile
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-1">
            <label className="mb-2 block text-sm text-white/70">Email</label>
            <input
              value={userEmail}
              disabled
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80"
            />
          </div>
          <div className="md:col-span-1">
            <label className="mb-2 block text-sm text-white/70">Full name</label>
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#2DD4BF]/50 focus:outline-none"
              placeholder="Security Engineer"
            />
          </div>
        </div>
        <button
          onClick={saveProfile}
          disabled={isPending}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2DD4BF] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#14B8A6] disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Profile
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-3xl">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Lock className="h-5 w-5 text-[#A78BFA]" /> Password
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#2DD4BF]/50 focus:outline-none"
            placeholder="New password"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#2DD4BF]/50 focus:outline-none"
            placeholder="Confirm password"
          />
        </div>
        <button
          onClick={updatePassword}
          disabled={isPending}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Update Password
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-3xl">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Key className="h-5 w-5 text-[#2DD4BF]" /> API Key
        </div>
        <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/90 break-all">
          {apiKey ?? "No API key generated yet"}
        </div>
        <button
          onClick={regenerateApiKey}
          disabled={isPending}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2DD4BF] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#14B8A6] disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />} Regenerate API Key
        </button>
      </section>
    </div>
  );
}
