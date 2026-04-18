"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  User,
  IdCard,
  Mail,
  Phone,
  Building2,
  ChevronDown,
  Lock,
  Monitor,
  LogOut,
  Ban,
  Loader2,
  Camera,
} from "lucide-react";
import {
  getUser,
  updateProfile,
  uploadAvatar,
  updatePassword,
} from "@/lib/supabase/auth-actions";
import { createClient } from "@/lib/supabase/client";
import PhishButton from "@/components/ui/PhishButton";

export default function UserProfilePage() {
  const [formData, setFormData] = useState({
    display_name: "",
    phone_number: "", // Link to profile.phone_number
    department: "Security Operations",
    avatar_url: "",
  });
  const [email, setEmail] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [sessionInfo, setSessionInfo] = useState<{ created_at: string } | null>(
    null,
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const session = data.session as any;
        const dt = session.created_at
          ? new Date(session.created_at * 1000)
          : new Date(session.user.created_at);
        setSessionInfo({ created_at: dt.toLocaleString() });
      }
    });
  }, []);

  useEffect(() => {
    getUser().then((user) => {
      if (user) {
        setFormData({
          display_name: user.fullName || "",
          phone_number: user.phone || "", // Correctly mapping profile.phone_number
          department: user.department || "Security Operations",
          avatar_url: user.avatarUrl || "",
        });
        setEmail(user.email);
      }
      setLoaded(true);
    });
  }, []);

  const getInitials = () => {
    if (formData.display_name)
      return formData.display_name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return "?";
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setPreviewImage(localUrl);
    setIsUploading(true);

    try {
      const data = new FormData();
      data.append("avatar", file);
      const result = await uploadAvatar(data);

      if (result?.error) {
        toast.error(result.error);
        setPreviewImage(null);
      } else {
        toast.success("Avatar updated");
        if (result?.avatarUrl)
          setFormData((prev) => ({ ...prev, avatar_url: result.avatarUrl }));
        setPreviewImage(null);
      }
    } catch {
      toast.error("Failed to upload avatar");
      setPreviewImage(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateProfile({
        fullName: formData.display_name,
        phone: formData.phone_number,
        department: formData.department,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile synchronized");
        window.dispatchEvent(new Event("profile-updated"));
      }
    });
  };

  const handlePasswordChange = () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Fill both password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    startTransition(async () => {
      const result = await updatePassword(newPassword);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Password updated");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  const displayAvatar = previewImage || formData.avatar_url;
  const cardHover = {
    whileHover: {
      scale: 1.01,
      boxShadow: "0 8px 32px rgba(45,212,191,0.15)",
    },
    transition: { type: "spring" as const, stiffness: 300, damping: 20 },
  };

  return (
    <div className="px-8 py-6 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-[#e6edf3] text-2xl font-semibold tracking-tight">
            Profile Settings
          </h1>
          <p className="text-[#8b949e] text-sm mt-0.5">
            Manage your identity and account security
          </p>
        </div>
        <PhishButton
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/10 transition-colors hover:bg-teal-400 disabled:opacity-50"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? "Saving..." : "Save Changes"}
        </PhishButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Avatar & Personal Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Avatar Card */}
          <motion.div {...cardHover} className="liquid-glass rounded-xl p-6">
            <h3 className="text-[#e6edf3] text-sm font-semibold mb-6">
              Profile Picture
            </h3>
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-[#0d1117] border border-[rgba(48,54,61,0.9)] flex items-center justify-center overflow-hidden">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-teal-400">
                      {getInitials()}
                    </span>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#1c2128] border border-[rgba(48,54,61,0.9)] rounded-full flex items-center justify-center text-[#8b949e] hover:text-teal-400 cursor-pointer transition-colors shadow-lg">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
              <div>
                <p className="text-[#e6edf3] text-sm font-medium">
                  Update your photo
                </p>
                <p className="text-[#8b949e] text-xs mt-1">
                  JPG, GIF or PNG. Max size of 2MB.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Personal Info Card */}
          <motion.div {...cardHover} className="liquid-glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-4 h-4 text-[#6e7681]" />
              <h3 className="text-[#e6edf3] text-sm font-semibold">
                Personal Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[#8b949e] text-xs font-medium">
                  Full Name
                </label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e7681]" />
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        display_name: e.target.value,
                      }))
                    }
                    className="w-full pl-10 pr-4 py-2 bg-[#0d1117] border border-[rgba(48,54,61,0.9)] rounded-lg text-sm text-[#e6edf3] focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none transition-all"
                    placeholder="E.g. John Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[#8b949e] text-xs font-medium">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e7681]" />
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full pl-10 pr-4 py-2 bg-[#1c2128] border border-[rgba(48,54,61,0.9)] rounded-lg text-sm text-[#6e7681] cursor-not-allowed outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[#8b949e] text-xs font-medium">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e7681]" />
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        phone_number: e.target.value,
                      }))
                    }
                    className="w-full pl-10 pr-4 py-2 bg-[#0d1117] border border-[rgba(48,54,61,0.9)] rounded-lg text-sm text-[#e6edf3] focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none transition-all"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[#8b949e] text-xs font-medium">
                  Department
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e7681]" />
                  <select
                    value={formData.department}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        department: e.target.value,
                      }))
                    }
                    className="w-full pl-10 pr-10 py-2 bg-[#0d1117] border border-[rgba(48,54,61,0.9)] rounded-lg text-sm text-[#e6edf3] focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none appearance-none transition-all"
                  >
                    <option>Security Operations</option>
                    <option>IT Administration</option>
                    <option>Executive</option>
                    <option>Engineering</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e] pointer-events-none" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right: Security & Sessions */}
        <div className="space-y-8">
          {/* Security Card */}
          <div className="liquid-glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-4 h-4 text-[#6e7681]" />
              <h3 className="text-[#e6edf3] text-sm font-semibold">Security</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[#8b949e] text-xs font-medium">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0d1117] border border-[rgba(48,54,61,0.9)] rounded-lg text-sm text-[#e6edf3] focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[#8b949e] text-xs font-medium">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0d1117] border border-[rgba(48,54,61,0.9)] rounded-lg text-sm text-[#e6edf3] focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <PhishButton
                onClick={handlePasswordChange}
                disabled={isPending || !newPassword}
                className="rounded-full w-full py-2 bg-[#1c2128] border border-[rgba(48,54,61,0.9)] text-[#e6edf3] hover:bg-[#21262d] text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Update Password
              </PhishButton>
            </div>
          </div>

          {/* Session Info */}
          <div className="liquid-glass rounded-xl p-6">
            <h3 className="text-[#e6edf3] text-sm font-semibold mb-6">
              Current Session
            </h3>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#3fb950]/10 flex items-center justify-center border border-[#3fb950]/20">
                <Monitor className="w-5 h-5 text-[#3fb950]" />
              </div>
              <div>
                <p className="text-[#e6edf3] text-sm font-medium">
                  Web Desktop
                </p>
                <p className="text-[#3fb950] text-[10px] font-bold uppercase tracking-wider">
                  Active Now
                </p>
              </div>
            </div>
            {sessionInfo && (
              <p className="text-[#8b949e] text-xs border-t border-white/10 pt-4">
                Started:{" "}
                <span className="text-[#e6edf3]">{sessionInfo.created_at}</span>
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3">
              <PhishButton
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut({ scope: "local" });
                  window.location.href = "/";
                }}
                className="flex items-center justify-center gap-2 w-full py-2 bg-transparent border border-[rgba(48,54,61,0.9)] text-[#e6edf3] hover:border-[#8b949e] text-sm font-medium rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </PhishButton>
              <PhishButton
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut({ scope: "global" });
                  window.location.href = "/";
                }}
                className="flex items-center justify-center gap-2 w-full py-2 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 text-sm font-medium rounded-lg transition-colors"
              >
                <Ban className="w-4 h-4" /> Global Sign Out
              </PhishButton>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border border-red-500/20 bg-red-500/[0.02] rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-[#f85149] text-sm font-semibold">
              Delete Account
            </h3>
            <p className="text-[#8b949e] text-xs mt-1">
              Once deleted, your data cannot be recovered. Please proceed with
              extreme caution.
            </p>
          </div>
          <PhishButton
            onClick={() =>
              toast.error("Account removal protected. Contact Security Ops.")
            }
            className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 text-sm font-medium rounded-lg transition-colors"
          >
            Delete Account
          </PhishButton>
        </div>
      </div>
    </div>
  );
}
