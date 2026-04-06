"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Github,
  Loader2,
} from "lucide-react";
import { signInWithEmail, signInWithSocial } from "@/lib/supabase/auth-actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slowMessage, setSlowMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSlowMessage(null);
    setIsSubmitting(true);

    const slowTimer = window.setTimeout(() => {
      setSlowMessage("Taking longer than expected...");
    }, 10000);

    try {
      const result = await signInWithEmail({ email, password });
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      window.clearTimeout(slowTimer);
      setIsSubmitting(false);
    }
  };

  const handleSocial = async (provider: "google" | "github") => {
    setError(null);
    setSlowMessage(null);
    setIsSubmitting(true);

    try {
      const result = await signInWithSocial(provider);
      if (result?.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-[#E6EDF3]">
      <div className="pointer-events-none fixed inset-0 z-0">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.7, 0.45], x: [0, 20, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] h-[60vw] w-[60vw] rounded-full bg-[#A78BFA] opacity-20 blur-[150px]"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.7, 0.45], x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-20%] right-[-10%] h-[60vw] w-[60vw] rounded-full bg-[#2DD4BF] opacity-20 blur-[150px]"
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="liquid-glass w-full max-w-md rounded-2xl p-6 sm:p-8"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2DD4BF]/30 bg-[#2DD4BF]/15 text-[#2DD4BF]">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-bold text-white">Phish-Slayer</p>
              <p className="text-xs text-[#8B949E]">Threat response console</p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-[#8B949E]">Sign in to continue monitoring threats.</p>
          </div>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSocial("google")}
              className="flex flex-1 items-center justify-center gap-3 rounded-[6px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSocial("github")}
              className="flex flex-1 items-center justify-center gap-3 rounded-[6px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <Github className="h-5 w-5" />
              GitHub
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-black px-3 text-[#8B949E] uppercase tracking-wide">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-[#E6EDF3]">
                Email address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#8B949E]">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-[#8B949E] focus:border-teal-400 focus:ring-0"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-[#E6EDF3]">
                  Password
                </label>
                <Link href="/auth/forgot-password" className="text-xs font-semibold text-[#2DD4BF] hover:text-[#5eead4]">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#8B949E]">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-10 pr-12 text-sm text-white placeholder:text-[#8B949E] focus:border-teal-400 focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#8B949E] hover:text-[#E6EDF3]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-white/10 bg-white/5 text-[#2DD4BF]"
              />
              <label htmlFor="remember" className="text-sm text-[#8B949E]">
                Remember me for 30 days
              </label>
            </div>

            {(error || slowMessage) && (
              <div className="rounded-[6px] border border-[#E3B341]/30 bg-[#E3B341]/10 px-3 py-2 text-xs text-[#E3B341]" aria-live="polite">
                {error ?? slowMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-teal-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#8B949E]">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="font-semibold text-[#2DD4BF] hover:text-[#5eead4]">
              Create one for free
            </Link>
          </p>

          <p className="mt-6 text-center text-xs text-[#8B949E]">
            {mounted ? new Date().getFullYear() : "-"} Phish-Slayer Enterprise Security
          </p>
        </motion.div>
      </div>
    </div>
  );
}

