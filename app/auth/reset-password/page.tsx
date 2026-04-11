"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = newPassword.length >= 8 && passwordsMatch;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) {
      setErrorMessage(
        "Passwords must match and be at least 8 characters long.",
      );
      setSuccessMessage(null);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setSuccessMessage("Your password has been updated successfully.");
    setIsLoading(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-md rounded-2xl bg-[radial-gradient(circle_at_top,#0f172a,#020617)] border border-slate-800 shadow-[0_0_40px_rgba(20,184,166,0.15)] p-8"
      >
        <h1 className="text-white font-bold text-2xl text-center">Reset Password</h1>
        <p className="text-slate-400 text-sm text-center mt-2 mb-6">
          Enter and confirm your new password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
            placeholder="Minimum 8 characters"
          />

          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
            placeholder="Re-enter new password"
          />

          {!passwordsMatch && confirmPassword.length > 0 ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Passwords do not match.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-black hover:from-teal-400 hover:to-cyan-400 hover:shadow-[0_0_20px_rgba(20,184,166,0.4)] transition-all duration-200 disabled:opacity-60"
          >
            {isLoading ? "Updating..." : "Update password"}
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
