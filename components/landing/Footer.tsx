import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Shield, Loader2 } from "lucide-react";

export function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("You're on the list! We'll be in touch. ðŸš€");
        setEmail("");
      } else {
        toast.error(data?.error || "Failed to subscribe. Please try again.");
      }
    } catch (err) {
      console.error("Newsletter error:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-[#080C10] text-[#8B949E] py-16 border-t border-[#1C2128]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 text-[#E6EDF3] font-bold text-lg mb-3 tracking-tight">
              <Shield className="w-5 h-5 text-[#2DD4BF]" strokeWidth={1.5} />{" "}
              PHISH-SLAYER
            </div>
            <p className="text-sm leading-[1.7] mb-6 text-[#8B949E]">
              Autonomous Blue Team AI â€” Monitor. Analyze. Neutralize.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email for updates"
                className="liquid-glass rounded-full px-6 py-2.5 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#2DD4BF] flex-1 min-w-0 font-mono text-[12px] placeholder:text-[#8B949E]/50 transition-colors"
              />
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="bg-[#2DD4BF] text-[#0D1117] font-bold px-6 py-2.5 rounded-full text-sm hover:bg-[#14B8A6] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Subscribe
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-[#E6EDF3] font-bold mb-4 tracking-tight">
              Product
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/#features"
                  className="hover:text-[#2DD4BF] transition-colors text-sm"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="hover:text-[#2DD4BF] transition-colors text-sm"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[#E6EDF3] font-bold mb-4 tracking-tight">
              Legal
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/legal/privacy"
                  className="hover:text-[#2DD4BF] transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/terms"
                  className="hover:text-[#2DD4BF] transition-colors text-sm"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[#E6EDF3] font-bold mb-4 tracking-tight">
              Company
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/contact"
                  className="hover:text-[#2DD4BF] transition-colors text-sm"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#1C2128] flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>Â© 2026 Phish-Slayer. All rights reserved.</p>
          <p>
            Built by{" "}
            <a
              href="https://phishslayer.tech"
              className="text-[#2DD4BF] hover:underline"
            >
              Muhammad Zain
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

