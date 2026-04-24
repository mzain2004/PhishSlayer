import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Page() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#22d3ee]/30 selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tighter">
            PhishSlayer
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="px-6 py-2 text-sm font-bold uppercase tracking-wider hover:text-[#22d3ee] transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/sign-up"
              className="px-6 py-2 bg-[#22d3ee] text-black text-sm font-bold uppercase tracking-wider rounded-none hover:bg-[#22d3ee]/90 transition-all"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-48 pb-24 text-center">
        <div className="inline-block px-4 py-1.5 mb-8 border border-[#22d3ee]/30 bg-[#22d3ee]/5 text-[#22d3ee] text-xs font-bold uppercase tracking-[0.2em]">
          AI Threat Detection Active
        </div>
        <h1 className="text-5xl md:text-8xl font-bold tracking-tighter mb-8 leading-[0.9] uppercase">
          NEUTRALIZE THREATS INSTANTLY.<br />
          ELIMINATE DWELL TIME FOREVER.
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 font-light leading-relaxed">
          Experience immediate, automated defense with real-time visibility, 
          eliminating risks before impact.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="w-full sm:w-auto px-10 py-5 bg-[#22d3ee] text-black font-bold uppercase tracking-widest rounded-none hover:bg-[#22d3ee]/90 transition-all"
          >
            Get Started
          </Link>
          <Link
            href="/sign-in"
            className="w-full sm:w-auto px-10 py-5 border border-white/10 text-white font-bold uppercase tracking-widest rounded-none hover:bg-white/5 transition-all"
          >
            Log In
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Card 1 */}
          <div className="flex flex-col gap-6 p-8 border border-white/5 bg-white/[0.02]">
            <div className="w-12 h-1 bg-[#22d3ee]" />
            <h3 className="text-2xl font-bold uppercase tracking-tight">Autonomous Triage</h3>
            <p className="text-gray-400 leading-relaxed font-light">
              Every alert enters a self-driving pipeline. Real-time normalization, 
              deduplication, and risk-based decisioning without human touch.
            </p>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col gap-6 p-8 border border-white/5 bg-white/[0.02]">
            <div className="w-12 h-1 bg-[#22d3ee]" />
            <h3 className="text-2xl font-bold uppercase tracking-tight">AI Threat Intel</h3>
            <p className="text-gray-400 leading-relaxed font-light">
              Global multi-source enrichment from OTX, MISP, and MalwareBazaar 
              correlated with internal behavior profiles instantly.
            </p>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col gap-6 p-8 border border-white/5 bg-white/[0.02]">
            <div className="w-12 h-1 bg-[#22d3ee]" />
            <h3 className="text-2xl font-bold uppercase tracking-tight">Zero Dwell Time</h3>
            <p className="text-gray-400 leading-relaxed font-light">
              Autonomous response orchestration reduces dwell time to near-zero. 
              Automated containment triggers the moment threats are confirmed.
            </p>
          </div>
        </div>
      </section>

      {/* Mission/Vision Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-12 bg-white/[0.03] border border-white/5">
            <h4 className="text-[#22d3ee] font-bold uppercase tracking-widest text-sm mb-4">Our Mission</h4>
            <p className="text-3xl font-bold leading-tight uppercase tracking-tighter">
              To secure your digital future by eliminating threats at the source.
            </p>
          </div>
          <div className="p-12 bg-white/[0.03] border border-white/5">
            <h4 className="text-[#22d3ee] font-bold uppercase tracking-widest text-sm mb-4">Our Vision</h4>
            <p className="text-3xl font-bold leading-tight uppercase tracking-tighter">
              A world where cyber safety is seamless and proactive for everyone.
            </p>
          </div>
        </div>
      </section>

      {/* Shell Simulation Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="bg-[#050505] p-8 border border-white/5 font-mono text-sm leading-relaxed overflow-x-auto">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-3 h-3 bg-red-500/20 rounded-full" />
            <div className="w-3 h-3 bg-yellow-500/20 rounded-full" />
            <div className="w-3 h-3 bg-green-500/20 rounded-full" />
            <span className="ml-4 text-white/20 uppercase tracking-[0.3em] text-[10px]">PhishSlayer Core Engine</span>
          </div>
          <p className="text-green-500">$ phishslayer-pipeline --ingest syslog --source 45.33.32.12</p>
          <p className="text-gray-500">[*] Ingesting RAW log stream... DONE</p>
          <p className="text-gray-500">[*] Normalizing CEF headers... DONE</p>
          <p className="text-gray-500">[*] Correlating with OTX indicators... MATCH FOUND</p>
          <p className="text-red-500 font-bold">[!] THREAT CONFIRMED: Cobalt Strike C2 Beacon</p>
          <p className="text-yellow-500 font-bold">[!] EXECUTING PLAYBOOK: "Malware Containment"</p>
          <p className="text-gray-500">[*] Triggering host isolation on Agent-004... DONE</p>
          <p className="text-blue-400 font-bold">[OK] Threat neutralized. Case #1294 CLOSED. MTTR: 4s</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-8 text-gray-600">
        <div className="text-xs uppercase tracking-[0.3em]">
          © 2026 PhishSlayer Autonomous SOC
        </div>
        <div className="flex gap-8 text-xs font-bold uppercase tracking-widest">
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
          <a href="#" className="hover:text-white transition-colors">Infrastructure</a>
          <a href="#" className="hover:text-white transition-colors">Support</a>
        </div>
      </footer>
    </div>
  );
}
