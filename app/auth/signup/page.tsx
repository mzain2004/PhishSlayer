"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  Eye,
  EyeOff,
  Github,
  X,
  Loader2,
} from "lucide-react";
import { signUpWithEmail, signInWithSocial } from "@/lib/supabase/auth-actions";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await signUpWithEmail({
        email,
        password,
        fullName,
        orgName,
      });
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success(result.success);
      }
    });
  };

  const handleSocial = (provider: "google" | "github") => {
    startTransition(async () => {
      const result = await signInWithSocial(provider);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  };

  const passwordStrength =
    password.length >= 10
      ? 3
      : password.length >= 8
        ? 2
        : password.length > 0
          ? 1
          : 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.45, 0.7, 0.45],
            x: [0, 20, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] h-[60vw] w-[60vw] rounded-full bg-[#A78BFA] opacity-20 blur-[150px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.45, 0.7, 0.45],
            x: [0, -20, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-[-20%] right-[-10%] h-[60vw] w-[60vw] rounded-full bg-[#2DD4BF] opacity-20 blur-[150px]"
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative w-full max-w-md rounded-2xl bg-white/5 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] p-8"
        >
          <div className="absolute right-4 top-4 text-white/40">
            <X className="h-5 w-5" />
          </div>

          <div className="mb-8 flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#A78BFA] to-[#2DD4BF]">
              <Shield className="h-4 w-4 text-black" />
            </div>
            <p className="text-xl font-bold tracking-tight">Phish-Slayer</p>
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white">Create an account</h1>
            <p className="mt-1 text-sm text-white/50">Join Phish-Slayer today</p>
          </div>

          <div className="mb-6 flex flex-col gap-4">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleSocial("google")}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
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
              disabled={isPending}
              onClick={() => handleSocial("github")}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#24292F] py-2.5 font-medium text-white transition-colors hover:bg-[#24292F]/90 disabled:opacity-50"
            >
              <Github className="h-5 w-5" />
              Sign up with GitHub
            </button>
          </div>

          <div className="relative mb-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative bg-[#050505] px-4 text-xs uppercase text-white/50">
              Or continue with email
            </span>
          </div>

          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isPending}
              placeholder="Full name"
              className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#2DD4BF]/50 focus:outline-none"
            />

            <input
              id="orgName"
              name="orgName"
              type="text"
              autoComplete="organization"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={isPending}
              placeholder="Organization"
              className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#2DD4BF]/50 focus:outline-none"
            />

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              placeholder="Email address"
              className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#2DD4BF]/50 focus:outline-none"
            />

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                placeholder="Password"
                className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2.5 pr-10 text-white placeholder:text-white/30 focus:border-[#2DD4BF]/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white/70"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {password.length > 0 && (
              <div className="mt-1 flex gap-1.5">
                <div
                  className={`h-1 flex-1 rounded bg-white/10 ${passwordStrength >= 1 ? "bg-[#E3B341]" : ""}`}
                />
                <div
                  className={`h-1 flex-1 rounded bg-white/10 ${passwordStrength >= 2 ? "bg-[#2DD4BF]" : ""}`}
                />
                <div
                  className={`h-1 flex-1 rounded bg-white/10 ${passwordStrength >= 3 ? "bg-[#3FB950]" : ""}`}
                />
              </div>
            )}

            <label className="flex items-start gap-2 text-sm leading-snug text-white/50">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="mt-0.5 h-4 w-4 rounded border-white/10 bg-white/5 text-[#2DD4BF]"
              />
              <span>
                I agree to the{" "}
                <a href="/legal/terms" className="font-semibold text-[#2DD4BF] hover:text-[#5eead4]">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/legal/privacy" className="font-semibold text-[#2DD4BF] hover:text-[#5eead4]">
                  Privacy Policy
                </a>
              </span>
            </label>

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2DD4BF] py-2.5 font-semibold text-black transition-colors hover:bg-[#14B8A6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isPending ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/50">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-[#2DD4BF] hover:text-[#2DD4BF]/80">
              Log in
            </Link>
          </p>

          <p className="mt-6 text-center text-xs text-white/40">
            {mounted ? new Date().getFullYear() : "-"} Phish-Slayer
          </p>
        </motion.div>
      </div>
    </div>
  );
}
