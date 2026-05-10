import { SignIn } from "@clerk/nextjs";
import { Shield } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#080D12] relative overflow-hidden px-4">

      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(124,92,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,92,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }} />

      {/* Glow */}
      <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,92,255,0.08) 0%, transparent 70%)' }} />

      {/* Logo */}
      <div className="flex items-center gap-2 mb-6 z-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-indigo-500/30"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))' }}>
          <Shield className="w-5 h-5 text-indigo-400" />
        </div>
        <span className="text-lg font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          PhishSlayer
        </span>
      </div>

      <h1 className="text-2xl font-semibold text-white mb-1 z-10">Welcome back</h1>
      <p className="text-sm text-gray-400 mb-6 z-10">Sign in to your SOC console</p>

      <div className="z-10">
        <SignIn
          appearance={{
            variables: {
              colorPrimary: '#6366F1',
              colorBackground: '#131318',
              colorText: '#f0f0f5',
              colorTextSecondary: '#a0a0b0',
              colorInputBackground: '#0f0f17',
              colorInputText: '#f0f0f5',
              borderRadius: '8px',
            },
            elements: {
              card: '!bg-[#131318] !border !border-[#1e1e2e] !shadow-[0_0_40px_rgba(99,102,241,0.05)]',
              socialButtonsBlockButton: '!bg-[#0f0f17] !border-[#1e1e2e] !text-white',
              formButtonPrimary: '!bg-indigo-500 hover:!bg-indigo-600',
              footerActionLink: '!text-purple-400',
              formFieldInput: '!bg-[#0f0f17] !border-[#1e1e2e] !text-white',
            },
          }}
        />
      </div>
    </div>
  );
}
