"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isValid = password.length >= 8 && passwordsMatch;

  return (
    <div className="flex min-h-screen w-full bg-[#fafafa] font-sans text-slate-900">
      {/* Left â€” Brand Panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/30 rounded-full blur-[120px]" />

        <div className="relative z-10 flex flex-col justify-between h-full px-12 py-14">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Phish-Slayer
            </span>
          </div>

          <div className="max-w-md">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm mb-8">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] tracking-tight mb-6">
              Choose a strong, unique password.
            </h1>
            <p className="text-blue-100 text-base leading-relaxed mb-8">
              Your new password should be at least 8 characters long and include
              a mix of letters, numbers, and symbols for maximum security.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <span className="text-sm text-blue-100">
                  Minimum 8 characters
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <span className="text-sm text-blue-100">
                  Mix of uppercase &amp; lowercase
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <span className="text-sm text-blue-100">
                  Include numbers or symbols
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-blue-200/70">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Phish-Slayer
            </span>
          </div>

          {!submitted ? (
            <>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#8B949E] hover:text-blue-600 transition-colors mb-8"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>

              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                  Create new password
                </h2>
                <p className="text-sm text-[#8B949E] leading-relaxed">
                  Your new password must be different from previously used
                  passwords.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isValid) return;
                  // TODO: wire to Supabase password update
                  setSubmitted(true);
                }}
                className="space-y-5"
              >
                {/* New Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8B949E]">
                      <Lock className="w-4 h-4" />
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
                      placeholder="Min. 8 characters"
                      className="block w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-12 text-sm text-slate-900 placeholder:text-[#8B949E] shadow-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#8B949E] hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {password.length > 0 && (
                    <div className="mt-2 flex gap-1.5">
                      <div
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= 1
                            ? password.length >= 8
                              ? "bg-emerald-500"
                              : "bg-orange-400"
                            : "bg-slate-200"
                        }`}
                      />
                      <div
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= 6
                            ? password.length >= 10
                              ? "bg-emerald-500"
                              : "bg-orange-400"
                            : "bg-slate-200"
                        }`}
                      />
                      <div
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= 10
                            ? "bg-emerald-500"
                            : "bg-slate-200"
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Confirm new password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8B949E]">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className={`block w-full rounded-lg border bg-white py-3 pl-10 pr-12 text-sm text-slate-900 placeholder:text-[#8B949E] shadow-sm transition-colors focus:ring-1 ${
                        confirmPassword.length > 0 && !passwordsMatch
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-slate-200 focus:border-blue-600 focus:ring-blue-600"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#8B949E] hover:text-slate-600 transition-colors"
                    >
                      {showConfirm ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="mt-1.5 text-xs font-medium text-red-500">
                      Passwords do not match
                    </p>
                  )}
                  {passwordsMatch && (
                    <p className="mt-1.5 text-xs font-medium text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!isValid}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Reset password
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
                Password updated
              </h2>
              <p className="text-sm text-[#8B949E] leading-relaxed mb-8">
                Your password has been successfully reset. You can now sign in
                with your new credentials.
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all"
              >
                Continue to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

