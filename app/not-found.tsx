import Link from "next/link";
import { ShieldAlert, Home } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/email";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] p-6 text-white text-center">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#7c6af7]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00d4aa]/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/5 border border-white/10 mx-auto">
          <ShieldAlert className="h-12 w-12 text-[#7c6af7]" />
        </div>

        <h1 className="mb-4 text-6xl font-black tracking-tighter">404</h1>
        <h2 className="mb-6 text-2xl font-bold text-slate-300">
          Target Not Found
        </h2>

        <p className="mb-10 max-w-md mx-auto text-slate-500 leading-relaxed">
          The coordinates you requested do not exist in the PhishSlayer grid.
          The path may have been quarantined or redirected.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-[#7c6af7] px-8 py-4 font-black text-white hover:bg-[#6b5ae6] transition-all shadow-[0_0_30px_rgba(124,106,247,0.3)]"
        >
          <Home className="h-5 w-5" />
          Back to Base
        </Link>
      </div>

      <footer className="fixed bottom-8 text-slate-700 text-xs font-mono uppercase tracking-[0.2em]">
        PhishSlayer Security Group // Access Log 404
        <div className="mt-1 normal-case font-sans text-[11px] tracking-normal">
          Need help?{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-[#2DD4BF] hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </footer>
    </div>
  );
}
