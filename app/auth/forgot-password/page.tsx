"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Mail,
  ArrowLeft,
  Send,
  CheckCircle2,
  KeyRound,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-[#fafafa] font-sans text-slate-900">
      {/* Left â€” Brand Panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative flex-col justify-between bg-black text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900 opacity-80" />
        <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] bg-teal-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[20rem] h-[20rem] bg-cyan-500/10 rounded-full blur-[80px]" />

        <div className="relative z-10 flex flex-col justify-between h-full px-12 py-14">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
              <ShieldAlert className="w-6 h-6 text-teal-400" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Phish-Slayer
            </span>
          </div>

          <div className="max-w-md">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-teal-500/10 backdrop-blur-sm mb-8">
              <KeyRound className="w-10 h-10 text-teal-400" />
            </div>
            <h1 className="text-4xl xl:text-5xl font-black leading-[1.1] tracking-tight mb-6">
              Account recovery made simple.
            </h1>
            <p className="text-teal-50/70 text-base leading-relaxed">
              We'll send a secure link to your registered email address. Click
              it to create a new password.
            </p>
          </div>

          <p className="text-xs text-[#8B949E] font-medium">
            Â© {mounted ? new Date().getFullYear() : "-"} Phish-Slayer Enterprise
            Security
          </p>
        </div>
      </div>

      {/* Right â€” Form / Success */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-teal-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Phish-Slayer
            </span>
          </div>

          {/* Back to login */}
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#8B949E] hover:text-teal-600 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>

          {!submitted ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                  Reset your password
                </h2>
                <p className="text-sm text-[#8B949E] leading-relaxed">
                  Enter the email address associated with your account.
                  We&apos;ll send you a link to reset your password.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // TODO: wire to Supabase password reset
                  setSubmitted(true);
                }}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8B949E]">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="block w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-[#8B949E] shadow-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-400 to-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg hover:shadow-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all border-none"
                >
                  <Send className="w-4 h-4" />
                  Send reset link
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                Check your inbox
              </h2>
              <p className="text-sm text-[#8B949E] leading-relaxed mb-8">
                We&apos;ve sent a password reset link to{" "}
                <span className="font-semibold text-slate-700">{email}</span>.
                Click the link in the email to create a new password.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-6">
                <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-2">
                  Didn&apos;t receive the email?
                </p>
                <ul className="text-sm text-slate-600 space-y-1.5">
                  <li>â€¢ Check your spam or junk folder</li>
                  <li>â€¢ Make sure you entered the correct email</li>
                  <li>
                    â€¢{" "}
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="font-semibold text-teal-600 hover:text-teal-500 transition-colors"
                    >
                      Try again with a different email
                    </button>
                  </li>
                </ul>
              </div>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-500 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

