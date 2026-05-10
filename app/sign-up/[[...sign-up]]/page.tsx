import { SignUp } from "@clerk/nextjs";
import { Shield } from "lucide-react";

const clerkAppearance = {
  variables: {
    colorPrimary: "#6366F1",
    colorBackground: "#131318",
    colorText: "#f0f0f5",
    colorInputBackground: "#1e1e2e",
    colorInputText: "#f0f0f5",
    colorTextSecondary: "#9ca3af",
    borderRadius: "12px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  elements: {
    rootBox: "mx-auto",
    card: "bg-[#131318] border border-[#1e1e2e] shadow-2xl",
    headerTitle: "text-white",
    headerSubtitle: "text-gray-400",
    socialButtonsBlockButton: "bg-[#1e1e2e] border-[#2a2a3e] text-white hover:bg-[#252535]",
    formButtonPrimary: "bg-[#6366F1] hover:bg-[#5558E6] shadow-lg",
    footerActionLink: "text-[#A855F7] hover:text-[#c084fc]",
    formFieldInput: "bg-[#1e1e2e] border-[#2a2a3e] text-[#f0f0f5]",
    identityPreviewEditButton: "text-[#A855F7]",
  },
};

export default function SignUpPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0f] relative overflow-hidden px-4 py-16"
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(99,102,241,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99,102,241,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Purple gradient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "5%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "700px",
          height: "700px",
          background:
            "radial-gradient(ellipse at center, rgba(99,102,241,0.18) 0%, rgba(168,85,247,0.10) 40%, transparent 70%)",
        }}
      />

      {/* Logo + welcome heading */}
      <div className="relative z-10 flex flex-col items-center mb-7">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-4">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[#f0f0f5] tracking-tight">
          Welcome to PhishSlayer
        </h1>
        <p className="text-sm text-[#9ca3af] mt-1">Your autonomous SOC platform</p>
      </div>

      {/* Clerk sign-up card */}
      <div className="relative z-10">
        <SignUp appearance={clerkAppearance} />
      </div>
    </div>
  );
}
