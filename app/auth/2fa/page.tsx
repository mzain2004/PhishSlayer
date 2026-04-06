"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  QrCode,
} from "lucide-react";

const OTP_LENGTH = 6;

export default function TwoFactorPage() {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [verified, setVerified] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const code = otp.join("");
  const isComplete =
    code.length === OTP_LENGTH && otp.every((d) => /\d/.test(d));

  const focusInput = useCallback((index: number) => {
    inputRefs.current[index]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return; // only single digit
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < OTP_LENGTH - 1) focusInput(index + 1);
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      focusInput(index - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    focusInput(Math.min(pasted.length, OTP_LENGTH - 1));
  };

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
              <Smartphone className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] tracking-tight mb-6">
              Two-factor authentication
            </h1>
            <p className="text-blue-100 text-base leading-relaxed mb-8">
              Scan the QR code with your authenticator app (like Google
              Authenticator or Authy), then enter the 6-digit verification code
              below.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <span className="text-sm text-blue-100">
                  Time-based one-time passwords
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <span className="text-sm text-blue-100">
                  Works offline â€” no SMS needed
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <span className="text-sm text-blue-100">
                  Phishing-resistant second factor
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

      {/* Right â€” 2FA Form / Success */}
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

          {!verified ? (
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
                  Verify your identity
                </h2>
                <p className="text-sm text-[#8B949E] leading-relaxed">
                  Scan this QR code with your authenticator app, then enter the
                  6-digit code it generates.
                </p>
              </div>

              {/* QR Code placeholder */}
              <div className="flex justify-center mb-8">
                <div className="relative w-48 h-48 rounded-2xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center">
                  <QrCode className="w-28 h-28 text-slate-800" />
                  {/* Overlay brand badge */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg">
                      <ShieldAlert className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual key */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8">
                <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-2">
                  Can&apos;t scan? Enter this key manually
                </p>
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2.5">
                  <code className="text-sm font-mono font-bold text-slate-800 tracking-widest select-all">
                    JBSW Y3DP EHPK 3PXP
                  </code>
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-700 text-xs font-semibold transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* OTP Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isComplete) return;
                  // TODO: wire to 2FA verification action
                  setVerified(true);
                }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Verification code
                  </label>
                  <div
                    className="flex gap-3 justify-center"
                    onPaste={handlePaste}
                  >
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          inputRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        className="w-12 h-14 rounded-lg border border-slate-200 bg-white text-center text-xl font-bold text-slate-900 shadow-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none"
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!isComplete}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Verify &amp; continue
                </button>
              </form>

              {/* Resend / Help */}
              <div className="mt-6 flex items-center justify-center gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => setOtp(Array(OTP_LENGTH).fill(""))}
                  className="inline-flex items-center gap-1.5 font-medium text-[#8B949E] hover:text-blue-600 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset code
                </button>
                <span className="text-slate-300">|</span>
                <Link
                  href="/dashboard/support"
                  className="font-medium text-[#8B949E] hover:text-blue-600 transition-colors"
                >
                  Need help?
                </Link>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 mx-auto mb-6">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                2FA enabled
              </h2>
              <p className="text-sm text-[#8B949E] leading-relaxed mb-8">
                Two-factor authentication is now active on your account.
                You&apos;ll be asked for a verification code each time you sign
                in.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all"
              >
                Continue to dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

