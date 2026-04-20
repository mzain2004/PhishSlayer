"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Github, Shield, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type SignupModalProps = {
  onClose: () => void;
  onSwitchToLogin: () => void;
};

const glassCard = "glass";

const tactileProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

export default function SignupModal({
  onClose,
  onSwitchToLogin,
}: SignupModalProps) {
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const redirectBase =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${redirectBase}/auth/callback`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setCheckEmail(true);
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
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-primary/20 shadow-[0_0_0_1px_rgba(124,106,247,0.18),0_0_36px_rgba(124,106,247,0.18)]" />
      <motion.button
        {...tactileProps}
        onClick={onClose}
        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </motion.button>

      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Shield className="w-4 h-4 text-black" />
        </div>
        <span className="font-space-grotesk font-extrabold text-xl tracking-tight text-white">
          Phish-Slayer
        </span>
      </div>

      {checkEmail ? (
        <>
          <h2 className="font-space-grotesk text-2xl font-bold text-white mb-2 text-center">
            Check your email
          </h2>
          <p className="text-white/50 text-center mb-6 text-sm">
            We&apos;ve sent a confirmation link to your inbox.
          </p>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="w-full bg-white/10 text-white font-semibold py-2.5 rounded-lg hover:bg-white/20 transition-colors mt-2"
          >
            Back to Log In
          </button>
        </>
      ) : (
        <>
          <h2 className="font-space-grotesk text-2xl font-bold text-white mb-2 text-center">
            Create an account
          </h2>
          <p className="text-white/50 text-center mb-6 text-sm">
            Join Phish-Slayer today
          </p>

          <div className="flex flex-col gap-4 mb-6">
            <button
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
              Sign up with Google
            </button>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#24292F] text-white font-medium hover:shadow-[0_0_18px_rgba(124,106,247,0.28)] transition-all"
            >
              <Github className="w-5 h-5" />
              Sign up with GitHub
            </button>
          </div>

          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <span className="relative bg-base px-4 text-xs text-white/50 uppercase">
              Or continue with email
            </span>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/15 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary transition-colors"
            />
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
              {loading ? "Creating Account..." : "Create Account"}
            </motion.button>
          </form>

          <p className="text-center text-sm text-white/50 mt-6">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-accent hover:text-accent/80 transition-colors font-medium"
            >
              Log in
            </button>
          </p>
        </>
      )}
    </motion.div>
  );
}
