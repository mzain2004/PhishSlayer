"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  BellRing,
  Lock,
  Loader2,
  Key,
  LogOut,
  Ban,
  ShieldAlert,
  AlertTriangle,
  Monitor,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getUser,
  updatePassword,
  updateNotifications,
} from "@/lib/supabase/auth-actions";
import { useRole } from "@/lib/rbac/useRole";
import { useRouter } from "next/navigation";

export default function PlatformSettingsPage() {
  const router = useRouter();

  // Notifications state
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyCritical, setNotifyCritical] = useState(true);
  const [notifyAssignments, setNotifyAssignments] = useState(true);
  const [notifyDigest, setNotifyDigest] = useState(false);

  // Security State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Session State
  const [sessionInfo, setSessionInfo] = useState<{
    created_at: string;
    token: string;
  } | null>(null);

  // Profile State
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { role } = useRole();

  const supabase = createClient();

  useEffect(() => {
    Promise.all([
      getUser().then((user) => {
        if (user) {
          setNotifyEmail(user.notifyEmail ?? true);
          setNotifyCritical(user.notifyCritical ?? true);
          setNotifyAssignments(user.notifyAssignments ?? true);
          setNotifyDigest(user.notifyDigest ?? false);
          setApiKey(user.apiKey || null);
        }
      }),
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          const session = data.session as any;
          const createdAtStr = session.created_at
            ? new Date(session.created_at * 1000).toLocaleDateString()
            : new Date(data.session.user.created_at).toLocaleDateString();
          setSessionInfo({ created_at: createdAtStr, token: "" });
        }
      }),
    ]).finally(() => {
      setLoaded(true);
    });
  }, []);

  const handleSaveNotifications = () => {
    startTransition(async () => {
      const result = await updateNotifications({
        notifyEmail,
        notifyCritical,
        notifyAssignments,
        notifyDigest,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Notification preferences saved successfully.");
      }
    });
  };

  const handlePasswordChange = () => {
    if (!newPassword || !confirmPassword || !currentPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    startTransition(async () => {
      const result = await updatePassword(newPassword);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  };

  const handleLogoutLocal = async () => {
    await supabase.auth.signOut({ scope: "local" });
    router.push("/auth/login");
  };

  const handleLogoutGlobal = async () => {
    await supabase.auth.signOut({ scope: "global" });
    router.push("/auth/login");
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const isSuperAdmin = role === "super_admin";

  return (
    <div className="bg-transparent text-slate-900 font-sans min-h-screen flex flex-col w-full overflow-x-hidden">
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Platform Settings
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Manage your notification preferences, security, and account
            sessions.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {/* Section 1: Notifications */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-teal-600" /> Notification
                  Preferences
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Configure how you receive alerts and updates.
                </p>
              </div>
              <button
                onClick={handleSaveNotifications}
                disabled={isPending}
                className="px-4 py-2 bg-gradient-to-r from-teal-400 to-blue-500 text-white font-bold rounded-lg shadow-sm hover:shadow-cyan-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Preferences
              </button>
            </div>
            <div className="p-6 md:p-8 space-y-4">
              {/* Toggle Item */}
              <label className="flex items-center justify-between py-2 cursor-pointer group">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                    Email Notifications
                  </span>
                  <span className="text-sm text-slate-500">
                    Receive system notifications via email.
                  </span>
                </div>
                <div
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${notifyEmail ? "bg-teal-600" : "bg-slate-200"}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                  />
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${notifyEmail ? "translate-x-6" : "translate-x-1"}`}
                  />
                </div>
              </label>
              <div className="h-px bg-slate-100 w-full" />
              {/* Toggle Item */}
              <label className="flex items-center justify-between py-2 cursor-pointer group">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                    Critical Threat Alerts
                  </span>
                  <span className="text-sm text-slate-500">
                    Immediate email alerts for CRITICAL severity scans.
                  </span>
                </div>
                <div
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${notifyCritical ? "bg-teal-600" : "bg-slate-200"}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={notifyCritical}
                    onChange={(e) => setNotifyCritical(e.target.checked)}
                  />
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${notifyCritical ? "translate-x-6" : "translate-x-1"}`}
                  />
                </div>
              </label>
              <div className="h-px bg-slate-100 w-full" />
              {/* Toggle Item */}
              <label className="flex items-center justify-between py-2 cursor-pointer group">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                    Incident Assignments
                  </span>
                  <span className="text-sm text-slate-500">
                    Get notified when a manager assigns an incident to you.
                  </span>
                </div>
                <div
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${notifyAssignments ? "bg-teal-600" : "bg-slate-200"}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={notifyAssignments}
                    onChange={(e) => setNotifyAssignments(e.target.checked)}
                  />
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${notifyAssignments ? "translate-x-6" : "translate-x-1"}`}
                  />
                </div>
              </label>
              <div className="h-px bg-slate-100 w-full" />
              {/* Toggle Item */}
              <label className="flex items-center justify-between py-2 cursor-pointer group">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                    Weekly Digest
                  </span>
                  <span className="text-sm text-slate-500">
                    Receive a weekly summary of organization security health.
                  </span>
                </div>
                <div
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${notifyDigest ? "bg-teal-600" : "bg-slate-200"}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={notifyDigest}
                    onChange={(e) => setNotifyDigest(e.target.checked)}
                  />
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${notifyDigest ? "translate-x-6" : "translate-x-1"}`}
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Section 2: Security Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Password Change */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-slate-400" /> Change Password
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Update your account access password.
                </p>
              </div>
              <div className="p-6 space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-teal-500"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-teal-500"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-teal-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handlePasswordChange}
                  disabled={
                    isPending ||
                    !newPassword ||
                    !confirmPassword ||
                    !currentPassword
                  }
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  Update Password
                </button>
              </div>
            </div>

            {/* Active Session & Logout */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-slate-400" /> Active
                  Session
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Manage your current authentication sessions.
                </p>
              </div>
              <div className="p-6 space-y-6 flex-1">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                  <Monitor className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900">
                        Current Device
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                        Active Now
                      </span>
                    </div>
                    {sessionInfo ? (
                      <p className="text-sm text-slate-600 mt-1">
                        Signed in since: {sessionInfo.created_at}
                      </p>
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600 mt-2" />
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleLogoutLocal}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout This Device
                  </button>
                  <button
                    onClick={handleLogoutGlobal}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    <Ban className="w-4 h-4 text-red-500" />
                    Logout All Devices
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: API Access */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="p-6 md:p-8 md:w-1/3 shrink-0">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-teal-600" /> API Access
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Programmatic access to Phish-Slayer REST endpoints for pipeline
                integration.
              </p>
            </div>
            <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
              {apiKey ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">
                    Your Current API Key
                  </p>
                  <code className="block w-full py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-sm tracking-wider">
                    {apiKey.substring(0, 8)}••••••••••••••••••••••••
                  </code>
                </div>
              ) : (
                <div className="text-center md:text-left">
                  <p className="text-sm text-slate-500">
                    No API key generated for this account.
                  </p>
                </div>
              )}
              <div className="mt-4">
                <Link
                  href="/dashboard/apikeys"
                  className="text-sm font-bold text-teal-600 hover:text-teal-700 hover:underline"
                >
                  Manage API Keys →
                </Link>
              </div>
            </div>
          </div>

          {/* Section 4: Danger Zone */}
          <div className="border border-red-200 bg-red-50 rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Danger Zone
              </h3>
              <p className="text-sm text-red-600/80 mt-1 max-w-lg">
                Permanently deactivate your organization account and purge all
                data. This action cannot be undone. Only accessible by Super
                Admins.
              </p>
            </div>
            <button
              disabled={!isSuperAdmin}
              title={
                !isSuperAdmin
                  ? "Only Super Admins can deactivate the account"
                  : "Deactivate Account"
              }
              onClick={() =>
                toast.error("Account termination workflow initiated.")
              }
              className="px-6 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold shadow-sm hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Deactivate Account
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
