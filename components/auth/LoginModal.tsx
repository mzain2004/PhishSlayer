"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Github, KeyRound, Shield, X } from "lucide-react";
import {
  createClient,
  createClientWithRememberMe,
  setRememberMePreference,
} from "@/utils/supabase/client";

type LoginModalProps = {
  onClose: () => void;
  onSwitchToSignup: () => void;
  onSwitchToForgot: () => void;
};

const glassCard = "glass";

const tactileProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

export default function LoginModal({
  onClose,
  onSwitchToSignup,
  onSwitchToForgot,
}: LoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setRememberMe(
      window.localStorage.getItem("phishslayer_remember_me") === "true",
    );
  }, []);

  const isMfaStep = useMemo(
    () => Boolean(mfaFactorId && mfaChallengeId),
    [mfaChallengeId, mfaFactorId],
  );

  const completeLogin = () => {
    router.push("/dashboard");
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    setRememberMePreference(rememberMe);
    const supabase = createClientWithRememberMe(rememberMe);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const factorsResult = await supabase.auth.mfa.listFactors();
    const allFactors = [
      ...(factorsResult.data?.totp || []),
      ...(((factorsResult.data as any)?.webauthn || []) as Array<any>),
    ];
    const verifiedFactors = allFactors.filter(
      (factor: any) => factor.status === "verified",
    );

    if (verifiedFactors.length === 0) {
      completeLogin();
      return;
    }

    const preferredTotp = verifiedFactors.find(
      (factor: any) => factor.factor_type === "totp",
    );
    if (preferredTotp) {
      const challenge = await supabase.auth.mfa.challenge({
        factorId: preferredTotp.id,
      });

      if (challenge.error) {
        setError(challenge.error.message);
        setLoading(false);
        return;
      }

      setMfaFactorId(preferredTotp.id);
      setMfaChallengeId(challenge.data.id);
      setLoading(false);
      return;
    }

    const webauthnFactor = verifiedFactors.find(
      (factor: any) => factor.factor_type === "webauthn",
    );

    if (webauthnFactor) {
      const passkeyResult = await (supabase.auth.mfa as any).challengeAndVerify(
        {
          factorId: webauthnFactor.id,
        },
      );
      if (passkeyResult.error) {
        setError(passkeyResult.error.message);
        setLoading(false);
        return;
      }
    }

    completeLogin();
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || !mfaChallengeId || mfaCode.trim().length !== 6) {
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const verifyResult = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: mfaChallengeId,
      code: mfaCode.trim(),
    });

    if (verifyResult.error) {
      setError(verifyResult.error.message);
      setLoading(false);
      return;
    }

    completeLogin();
  };

  const handlePasskeySignIn = async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const factorsResult = await supabase.auth.mfa.listFactors();
    const webauthnFactors =
      ((factorsResult.data as any)?.webauthn as Array<any> | undefined)?.filter(
        (factor) => factor.status === "verified",
      ) || [];

    if (webauthnFactors.length === 0) {
      setError("No registered passkey found. Register one in Settings first.");
      setLoading(false);
      return;
    }

    const result = await (supabase.auth.mfa as any).challengeAndVerify({
      factorId: webauthnFactors[0].id,
    });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    completeLogin();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`relative w-full max-w-md p-10 ${glassCard} flex flex-col`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-primary/20 shadow-[0_0_0_1px_rgba(124,106,247,0.18),0_0_36px_rgba(124,106,247,0.18)]" />
      <motion.button
        {...tactileProps}
        onClick={onClose}
        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </motion.button>

      <div className="flex items-center justify-center gap-2 mb-8 relative z-10">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Shield className="w-4 h-4 text-black" />
        </div>
        <span className="font-space-grotesk font-bold text-xl tracking-tight text-white">
          Phish-Slayer
        </span>
      </div>

      {isMfaStep ? (
        <>
          <h2 className="font-space-grotesk text-2xl font-bold text-white mb-2 text-center relative z-10">
            Verify Code
          </h2>
          <p className="text-white/60 text-center mb-6 text-sm relative z-10">
            Enter the 6-digit code from your authenticator app.
          </p>

          <form
            className="flex flex-col gap-4 relative z-10"
            onSubmit={handleVerifyMfa}
          >
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-slate-900/90 border border-white/15 rounded-lg px-4 py-3 text-white tracking-[0.35em] text-center text-lg placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary transition-colors"
            />

            {error ? (
              <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            ) : null}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || mfaCode.trim().length !== 6}
              className="w-full bg-primary text-white font-semibold py-3 rounded-lg transition-all mt-1 hover:shadow-[0_0_24px_rgba(124,106,247,0.45)] disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </motion.button>
          </form>
        </>
      ) : (
        <>
          <h2 className="font-space-grotesk text-2xl font-bold text-white mb-2 text-center relative z-10">
            Welcome back
          </h2>
          <p className="text-white/60 text-center mb-6 text-sm relative z-10">
            Log in to your account to continue
          </p>

          <div className="flex flex-col gap-3 mb-6 relative z-10">
            <motion.button
              {...tactileProps}
              type="button"
              onClick={() => void handlePasskeySignIn()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-900 text-accent border border-accent/30 font-semibold hover:shadow-[0_0_20px_rgba(0,212,170,0.3)] transition-all"
            >
              <KeyRound className="w-4 h-4" />
              Sign in with Passkey
            </motion.button>

            <motion.button
              {...tactileProps}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white text-black font-medium hover:shadow-[0_0_18px_rgba(255,255,255,0.3)] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </motion.button>
            <motion.button
              {...tactileProps}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#24292F] text-white font-medium hover:shadow-[0_0_18px_rgba(124,106,247,0.28)] transition-all"
            >
              <Github className="w-5 h-5" />
              Continue with GitHub
            </motion.button>
          </div>

          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative bg-base px-4 text-xs text-white/50 uppercase">
              Or continue with email
            </span>
          </div>

          <form
            className="flex flex-col gap-4 relative z-10"
            onSubmit={handleSubmit}
          >
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/15 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary transition-colors"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/15 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary transition-colors"
            />
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/10 bg-black/50 text-accent focus:ring-accent/50"
                />
                Remember me
              </label>
              <motion.button
                {...tactileProps}
                type="button"
                onClick={onSwitchToForgot}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </motion.button>
            </div>

            {error ? (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            ) : null}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading}
              className="group relative overflow-hidden w-full bg-primary text-white font-semibold py-3 rounded-lg transition-colors duration-300 mt-2 hover:shadow-[0_0_24px_rgba(124,106,247,0.45)] disabled:opacity-60"
            >
              <span className="pointer-events-none absolute inset-y-0 -left-10 w-10 bg-white/40 blur-sm group-hover:translate-x-[300px] transition-transform duration-700" />
              {loading ? "Logging In..." : "Log In"}
            </motion.button>
          </form>

          <p className="text-center text-sm text-white/50 mt-6 relative z-10">
            Don&apos;t have an account?{" "}
            <motion.button
              {...tactileProps}
              type="button"
              onClick={onSwitchToSignup}
              className="text-accent hover:text-accent/80 transition-colors font-medium"
            >
              Sign up
            </motion.button>
          </p>
        </>
      )}
    </motion.div>
  );
}
