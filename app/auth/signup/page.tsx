"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Building2,
  ArrowRight,
  Github,
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
    password.length >= 10 ? 3 : password.length >= 8 ? 2 : password.length > 0 ? 1 : 0;

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
          className="liquid-glass w-full max-w-xl rounded-2xl p-6 sm:p-8"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-bold text-white">Phish-Slayer</p>
              <p className="text-xs text-[#8B949E]">Start securing your domain</p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="mt-1 text-sm text-[#8B949E]">Get started with enterprise-grade phishing protection.</p>
          </div>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={isPending}
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
              disabled={isPending}
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
              <span className="bg-black px-3 text-[#8B949E] uppercase tracking-wide">or create with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="fullName" className="mb-1.5 block text-sm font-semibold text-[#E6EDF3]">
                  Full name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#8B949E]">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isPending}
                    placeholder="Alex Morgan"
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-[#8B949E] focus:border-teal-400 focus:ring-0"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="orgName" className="mb-1.5 block text-sm font-semibold text-[#E6EDF3]">
                  Organization
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#8B949E]">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <input
                    id="orgName"
                    name="orgName"
                    type="text"
                    autoComplete="organization"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    disabled={isPending}
                    placeholder="Acme Corp"
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-[#8B949E] focus:border-teal-400 focus:ring-0"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-[#E6EDF3]">
                Work email
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
                  disabled={isPending}
                  placeholder="alex@acme-corp.com"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-[#8B949E] focus:border-teal-400 focus:ring-0"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-[#E6EDF3]">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#8B949E]">
                  <Lock className="h-4 w-4" />
                </span>
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
                  placeholder="Min. 8 characters"
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

              {password.length > 0 && (
                <div className="mt-2 flex gap-1.5">
                  <div className={`h-1 flex-1 rounded bg-white/10 ${passwordStrength >= 1 ? "bg-[#E3B341]" : ""}`} />
                  <div className={`h-1 flex-1 rounded bg-white/10 ${passwordStrength >= 2 ? "bg-[#2DD4BF]" : ""}`} />
                  <div className={`h-1 flex-1 rounded bg-white/10 ${passwordStrength >= 3 ? "bg-[#3FB950]" : ""}`} />
                </div>
              )}
            </div>

            <div className="flex items-start gap-2">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="mt-0.5 h-4 w-4 rounded border-white/10 bg-white/5 text-[#2DD4BF]"
              />
              <label htmlFor="terms" className="text-sm leading-snug text-[#8B949E]">
                I agree to the{" "}
                <a href="/legal/terms" className="font-semibold text-[#2DD4BF] hover:text-[#5eead4]">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/legal/privacy" className="font-semibold text-[#2DD4BF] hover:text-[#5eead4]">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-teal-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {isPending ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#8B949E]">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-[#2DD4BF] hover:text-[#5eead4]">
              Sign in
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
