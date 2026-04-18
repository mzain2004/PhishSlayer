"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Key,
  Loader2,
  Lock,
  QrCode,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PhishButton from "@/components/ui/PhishButton";

type Props = {
  userId: string;
  userEmail: string;
  initialFullName: string;
  initialApiKey: string | null;
  initialAvatarUrl: string | null;
};

function generateApiKey() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
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
  initialAvatarUrl,
}: Props) {
  const supabase = createClient();
  const [profileName, setProfileName] = useState(initialFullName);
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [hasTotp, setHasTotp] = useState(false);
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [totpQr, setTotpQr] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [isPending, startTransition] = useTransition();

  const refreshMfaFactors = async () => {
    const factorsResult = await supabase.auth.mfa.listFactors();
    const totpFactors = factorsResult.data?.totp || [];
    const webauthnFactors = (
      ((factorsResult.data as any)?.webauthn as Array<any> | undefined) || []
    ).filter((factor) => factor.status === "verified");

    const verifiedTotp = totpFactors.find(
      (factor) => factor.status === "verified",
    );
    setHasTotp(Boolean(verifiedTotp));
    setHasPasskey(webauthnFactors.length > 0);
    if (verifiedTotp) {
      setTotpFactorId(verifiedTotp.id);
      setTotpQr(null);
    }
  };

  const registerPasskey = () => {
    setMfaLoading(true);
    startTransition(async () => {
      const enrollResult = await (supabase.auth.mfa as any).enroll({
        factorType: "webauthn",
        friendlyName: "Phish-Slayer Passkey",
      });

      if (enrollResult.error) {
        toast.error(enrollResult.error.message);
        setMfaLoading(false);
        return;
      }

      const factorId = enrollResult.data?.id as string | undefined;
      if (!factorId) {
        toast.error("Unable to register passkey");
        setMfaLoading(false);
        return;
      }

      const verifyResult = await (supabase.auth.mfa as any).challengeAndVerify({
        factorId,
      });

      if (verifyResult.error) {
        toast.error(verifyResult.error.message);
        setMfaLoading(false);
        return;
      }

      toast.success("Passkey registered");
      await refreshMfaFactors();
      setMfaLoading(false);
    });
  };

  const enableAuthenticator = () => {
    setMfaLoading(true);
    startTransition(async () => {
      const enrollResult = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Phish-Slayer Authenticator",
      });

      if (enrollResult.error) {
        toast.error(enrollResult.error.message);
        setMfaLoading(false);
        return;
      }

      const factorId = enrollResult.data?.id;
      if (!factorId) {
        toast.error("Unable to enroll authenticator factor");
        setMfaLoading(false);
        return;
      }

      const qrCode = enrollResult.data?.totp?.qr_code;
      setTotpFactorId(factorId);
      setTotpQr(qrCode || null);
      toast.success("Authenticator enrolled. Scan QR and verify code.");
      setMfaLoading(false);
    });
  };

  const verifyTotp = () => {
    if (!totpFactorId || totpCode.trim().length !== 6) {
      toast.error("Enter a valid 6-digit code");
      return;
    }

    setMfaLoading(true);
    startTransition(async () => {
      const challengeResult = await supabase.auth.mfa.challenge({
        factorId: totpFactorId,
      });

      if (challengeResult.error) {
        toast.error(challengeResult.error.message);
        setMfaLoading(false);
        return;
      }

      const verifyResult = await supabase.auth.mfa.verify({
        factorId: totpFactorId,
        challengeId: challengeResult.data.id,
        code: totpCode.trim(),
      });

      if (verifyResult.error) {
        toast.error(verifyResult.error.message);
        setMfaLoading(false);
        return;
      }

      toast.success("Authenticator verified");
      setTotpCode("");
      setTotpQr(null);
      await refreshMfaFactors();
      setMfaLoading(false);
    });
  };

  useEffect(() => {
    void refreshMfaFactors();
  }, []);

  const saveProfile = () => {
    startTransition(async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: profileName })
        .eq("id", userId);

      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Profile saved");
    });
  };

  const handleAvatarUpload = (file: File | null) => {
    if (!file) return;

    startTransition(async () => {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(`${userId}/avatar`, file, { upsert: true });

      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(`${userId}/avatar`);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) {
        toast.error(updateError.message);
        return;
      }

      setAvatarUrl(publicUrl);
      toast.success("Avatar updated");
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
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
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

  const hoverProps = {
    whileHover: {
      scale: 1.02,
      boxShadow: "0 8px 32px rgba(45, 212, 191, 0.15)",
    },
    transition: { type: "spring" as const, stiffness: 300, damping: 20 },
  };

  return (
    <div className="flex flex-col gap-6 text-white">
      <motion.header
        {...hoverProps}
        className="rounded-xl border border-white/10 bg-white/5 p-6"
      >
        <h1 className="dashboard-page-title">Platform Settings</h1>
        <p className="mt-2 text-sm text-white/60">
          Manage profile information, account security, and API access.
        </p>
      </motion.header>

      <motion.section
        {...hoverProps}
        className="rounded-xl border border-white/10 bg-white/5 p-6"
      >
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <User className="h-5 w-5 text-[#2DD4BF]" /> Profile
        </div>
        <div className="mb-6 flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile avatar"
              className="h-16 w-16 rounded-full border border-white/20 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-semibold text-[#E6EDF3]">
              {(profileName.trim() || userEmail || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
            Upload Avatar
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleAvatarUpload(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-1">
            <label className="mb-2 block text-sm text-white/70">Email</label>
            <input
              value={userEmail}
              disabled
              className="w-full rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/30 px-3 py-2 text-sm text-white/80"
            />
          </div>
          <div className="md:col-span-1">
            <label className="mb-2 block text-sm text-white/70">
              Full name
            </label>
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#2DD4BF]/50 focus:outline-none"
              placeholder="Security Engineer"
            />
          </div>
        </div>
        <PhishButton
          onClick={saveProfile}
          disabled={isPending}
          whileHover={{
            scale: 1.03,
            boxShadow: "0 0 20px rgba(45,212,191,0.4)",
          }}
          whileTap={{ scale: 0.96 }}
          className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-black [transition:all_0.2s_ease] [background:linear-gradient(135deg,#2DD4BF,#22c55e)] disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}{" "}
          Save Profile
        </PhishButton>
      </motion.section>

      <motion.section
        {...hoverProps}
        className="rounded-xl border border-white/10 bg-white/5 p-6"
      >
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Lock className="h-5 w-5 text-[#A78BFA]" /> Password
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#2DD4BF]/50 focus:outline-none"
            placeholder="New password"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#2DD4BF]/50 focus:outline-none"
            placeholder="Confirm password"
          />
        </div>
        <PhishButton
          onClick={updatePassword}
          disabled={isPending}
          whileHover={{ backgroundColor: "rgba(255,255,255,0.14)" }}
          whileTap={{ scale: 0.96 }}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] px-5 py-2 text-sm font-semibold text-white [transition:all_0.2s_ease] disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Lock className="h-4 w-4" />
          )}{" "}
          Update Password
        </PhishButton>
      </motion.section>

      <motion.section
        {...hoverProps}
        className="rounded-xl border border-white/10 bg-white/5 p-6"
      >
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Key className="h-5 w-5 text-[#2DD4BF]" /> API Key
        </div>
        <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/40 px-3 py-2 text-sm text-white/90 break-all">
          {apiKey ?? "No API key generated yet"}
        </div>
        <PhishButton
          onClick={regenerateApiKey}
          disabled={isPending}
          whileHover={{
            scale: 1.03,
            boxShadow: "0 0 20px rgba(45,212,191,0.4)",
          }}
          whileTap={{ scale: 0.96 }}
          className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-black [transition:all_0.2s_ease] [background:linear-gradient(135deg,#2DD4BF,#22c55e)] disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Key className="h-4 w-4" />
          )}{" "}
          Regenerate API Key
        </PhishButton>
      </motion.section>

      <motion.section
        {...hoverProps}
        className="rounded-xl border border-white/10 bg-white/5 p-6"
      >
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-5 w-5 text-cyan-300" /> Multi-factor
          Authentication
        </div>
        <p className="text-sm text-white/60">
          Add phishing-resistant passkeys and authenticator app verification to
          secure your account.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/30 p-4">
            <p className="text-sm font-semibold text-white">
              Passkey (WebAuthn)
            </p>
            <p className="mt-1 text-xs text-white/60">
              Use device biometrics or a security key for passwordless
              second-factor verification.
            </p>
            <p className="mt-2 text-xs text-cyan-200">
              Status: {hasPasskey ? "Registered" : "Not configured"}
            </p>
            <PhishButton
              onClick={registerPasskey}
              disabled={isPending || mfaLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {mfaLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              Register Passkey
            </PhishButton>
          </div>

          <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/30 p-4">
            <p className="text-sm font-semibold text-white">
              Authenticator App (TOTP)
            </p>
            <p className="mt-1 text-xs text-white/60">
              Connect Google Authenticator/Authy and verify with a 6-digit
              time-based code.
            </p>
            <p className="mt-2 text-xs text-cyan-200">
              Status: {hasTotp ? "Verified" : "Not configured"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PhishButton
                onClick={enableAuthenticator}
                disabled={isPending || mfaLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {mfaLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4" />
                )}
                Enable Authenticator App
              </PhishButton>
            </div>
          </div>
        </div>

        {totpQr ? (
          <div className="mt-4 rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/30 p-4">
            <p className="text-sm text-white/80 mb-3">
              Scan this QR code and verify your 6-digit code:
            </p>
            <img
              src={totpQr}
              alt="Authenticator QR code"
              className="h-40 w-40 rounded-lg border border-white/20 bg-white p-2"
              loading="lazy"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                placeholder="123456"
                className="w-36 rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/40 px-3 py-2 text-sm tracking-[0.2em] text-white placeholder:text-white/40 focus:border-[#2DD4BF]/50 focus:outline-none"
              />
              <PhishButton
                onClick={verifyTotp}
                disabled={isPending || mfaLoading || totpCode.length !== 6}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
              >
                Verify Code
              </PhishButton>
            </div>
          </div>
        ) : null}
      </motion.section>
    </div>
  );
}
