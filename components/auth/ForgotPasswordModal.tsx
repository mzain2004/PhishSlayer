"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type ForgotPasswordModalProps = {
  onClose: () => void;
  onSwitchToLogin: () => void;
};

const glassCard =
  "bg-[radial-gradient(circle_at_top,#0f172a,#020617)] backdrop-blur-md border border-slate-800 shadow-[0_0_40px_rgba(20,184,166,0.15)] rounded-2xl";

const tactileProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

export default function ForgotPasswordModal({
  onClose,
  onSwitchToLogin,
}: ForgotPasswordModalProps) {
  const supabase = createClient();
  const [view, setView] = useState<"forgot" | "reset">("forgot");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const redirectBase =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email
    );

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setView("reset");
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`relative w-full max-w-md p-8 ${glassCard} flex flex-col`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-cyan-300/20 shadow-[0_0_0_1px_rgba(45,212,191,0.15),0_0_36px_rgba(45,212,191,0.12)]" />
      <motion.button
        {...tactileProps}
        onClick={onClose}
        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </motion.button>

      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#2DD4BF] flex items-center justify-center">
          <Shield className="w-4 h-4 text-black" />
        </div>
        <span className="font-space-grotesk font-extrabold text-xl tracking-tight text-white">
          Phish-Slayer
        </span>
      </div>

      {view === "forgot" && (
        <>
          <h2 className="font-space-grotesk text-2xl font-bold text-white mb-2 text-center">
            Reset password
          </h2>
          <p className="text-white/50 text-center mb-6 text-sm">
            Enter your email to receive a reset link
          </p>

          <form className="flex flex-col gap-4" onSubmit={handleForgotSubmit}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/15 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/60 focus:border-[#2DD4BF] transition-colors"
            />

            {error ? (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            ) : null}

            <motion.button
              whileHover={{
                scale: 1.02,
                boxShadow: "0 0 15px rgba(45,212,191,0.5)",
              }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading}
              className="group relative overflow-hidden w-full bg-gradient-to-r from-cyan-400 to-teal-400 text-black font-semibold py-3 rounded-lg transition-colors duration-300 mt-2 disabled:opacity-60"
            >
              <span className="pointer-events-none absolute inset-y-0 -left-10 w-10 bg-white/40 blur-sm group-hover:translate-x-[300px] transition-transform duration-700" />
              {loading ? "Sending..." : "Send Reset Link"}
            </motion.button>
          </form>

          <p className="text-center text-sm text-white/50 mt-6">
            Remember your password?{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-[#2DD4BF] hover:text-[#2DD4BF]/80 transition-colors font-medium"
            >
              Log in
            </button>
          </p>
        </>
      )}

      {view === "reset" && (
        <>
          <h2 className="font-space-grotesk text-2xl font-bold text-white mb-2 text-center">
            Check your email
          </h2>
          <p className="text-white/50 text-center mb-6 text-sm">
            We&apos;ve sent a password reset link to your email address.
          </p>

          <button
            type="button"
            onClick={onSwitchToLogin}
            className="w-full bg-white/10 text-white font-semibold py-2.5 rounded-lg hover:bg-white/20 transition-colors mt-2"
          >
            Back to Log In
          </button>
        </>
      )}
    </motion.div>
  );
}
