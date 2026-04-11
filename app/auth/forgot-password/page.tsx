"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.NEXT_PUBLIC_SITE_URL + "/auth/reset-password",
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setSuccessMessage("Password reset email sent. Please check your inbox.");
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-md rounded-2xl bg-[radial-gradient(circle_at_top,#0f172a,#020617)] border border-slate-800 shadow-[0_0_40px_rgba(20,184,166,0.15)] p-8"
      >
        <h1 className="text-white font-bold text-2xl text-center">Forgot Password</h1>
        <p className="text-slate-400 text-sm text-center mt-2 mb-6">
          Enter your email and we will send a password reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
            placeholder="you@company.com"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-black hover:from-teal-400 hover:to-cyan-400 hover:shadow-[0_0_20px_rgba(20,184,166,0.4)] transition-all duration-200 disabled:opacity-60"
          >
            {isLoading ? "Sending..." : "Send reset link"}
          </button>

          {errorMessage ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {errorMessage}
            </p>
          ) : null}
          {successMessage ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {successMessage}
            </p>
          ) : null}
        </form>

        <Link
          href="/auth/login"
          className="mt-6 inline-block text-sm font-medium text-teal-400 hover:text-teal-300"
        >
          Back to sign in
        </Link>
      </motion.div>
    </main>
  );
}
