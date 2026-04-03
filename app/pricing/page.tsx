"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Shield, Check, X, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";

const tiers = [
  {
    name: "Recon",
    id: "recon",
    monthlyPrice: 0,
    desc: "For security researchers and lone hunters",
    popular: false,
    priceIdEnv: null,
    features: [
      { text: "Core Scan Engine", ok: true },
      { text: "WHOIS & DNS Analysis", ok: true },
      { text: "Intel Vault (Public)", ok: true },
      { text: "AI Threat Narrator", ok: false },
      { text: "Fleet Agents (1)", ok: false },
      { text: "Offline Fallback", ok: false },
    ],
  },
  {
    name: "SOC Pro",
    id: "soc_pro",
    monthlyPrice: 49,
    desc: "For SOC professionals managing small fleets",
    popular: true,
    priceIdEnv: process.env.NEXT_PUBLIC_PADDLE_SOC_PRO_PRICE_ID || "",
    features: [
      { text: "Core Scan Engine", ok: true },
      { text: "WHOIS & DNS Analysis", ok: true },
      { text: "Intel Vault (Private)", ok: true },
      { text: "AI Threat Narrator", ok: true },
      { text: "Fleet Agents (10)", ok: true },
      { text: "Offline Fallback", ok: false },
    ],
  },
  {
    name: "Command & Control",
    id: "command_control",
    monthlyPrice: 299,
    desc: "For global SOC operations and MSSPs",
    popular: false,
    priceIdEnv: process.env.NEXT_PUBLIC_PADDLE_CC_PRICE_ID || "",
    features: [
      { text: "Core Scan Engine", ok: true },
      { text: "WHOIS & DNS Analysis", ok: true },
      { text: "Intel Vault (Global)", ok: true },
      { text: "AI Threat Narrator", ok: true },
      { text: "Fleet Agents (Unlimited)", ok: true },
      { text: "Offline Fallback", ok: true },
    ],
  },
];

const faqs = [
  {
    q: "Can I change plans anytime?",
    a: "Yes! Upgrades take effect instantly. Downgrades apply at your next billing cycle.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — paid plans include a 14-day free trial. No credit card required to start.",
  },
  {
    q: "Is my data secure?",
    a: "Absolutely. SOC2 ready, Row Level Security enforced on all data, encrypted at rest and in transit.",
  },
];

export default function PricingPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [userTier, setUserTier] = useState<string>("recon");
  const [userEmail, setUserEmail] = useState<string>("");
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [paddleInitError, setPaddleInitError] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize Paddle client
  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;

    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    console.log("Initializing Paddle...");
    console.log("Token:", token ? "present" : "MISSING");

    if (!token) {
      setPaddleInitError(true);
      return;
    }

    initializePaddle({
      token,
      environment:
        process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
          ? "production"
          : "sandbox",
      eventCallback: (event) => {
        if (event.name === "checkout.completed") {
          toast.success("Payment successful! Redirecting to dashboard...");
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 2000);
        }
        if (event.name === "checkout.closed") {
          setCheckoutLoading(null);
        }
      },
    })
      .then((paddleInstance) => {
        console.log("Paddle ready:", !!paddleInstance);
        setPaddle(paddleInstance || null);
        setPaddleInitError(!paddleInstance);
      })
      .catch((err) => {
        console.error("Paddle init failed:", err);
        setPaddleInitError(true);
      });
  }, [mounted]);

  // Load user state
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
      if (data.user) {
        setUserEmail(data.user.email || "");
        supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.subscription_tier) {
              setUserTier(profile.subscription_tier.toLowerCase());
            }
            setLoadingConfig(false);
          });
      } else {
        setLoadingConfig(false);
      }
    });
  }, []);

  const openCheckout = useCallback(
    (tierId: string, priceId: string) => {
      if (paddleInitError) {
        toast.error("Payment unavailable");
        return;
      }

      if (!paddle) {
        toast.error("Payment system loading. Please try again.");
        return;
      }

      if (!priceId) {
        toast.error("Price configuration missing. Contact support.");
        return;
      }

      setCheckoutLoading(tierId);

      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        ...(userEmail ? { customer: { email: userEmail } } : {}),
        settings: {
          displayMode: "overlay",
          theme: "dark",
          successUrl: `${window.location.origin}/dashboard`,
        },
      });
    },
    [paddle, userEmail],
  );

  const getButtonConfig = (t: (typeof tiers)[0]) => {
    const normalizedTier = (userTier || "recon").toLowerCase();
    const isReconOrFree =
      normalizedTier === "recon" || normalizedTier === "free";

    if (!isLoggedIn) {
      if (t.id === "recon") {
        return {
          text: "Get Started Free",
          action: () => {
            window.location.href = "/auth/signup";
          },
          disabled: false,
          kind: "outline" as const,
          requiresCheckout: false,
        };
      }

      return {
        text: "Get Started",
        action: () => {
          window.location.href = "/auth/signup";
        },
        disabled: false,
        kind: t.id === "soc_pro" ? ("teal" as const) : ("gradient" as const),
        requiresCheckout: false,
      };
    }

    if (isReconOrFree) {
      if (t.id === "recon") {
        return {
          text: "Current Plan",
          action: () => {},
          disabled: true,
          kind: "disabled" as const,
          requiresCheckout: false,
        };
      }

      if (t.id === "soc_pro") {
        return {
          text: "Upgrade to SOC Pro",
          action: () => openCheckout(t.id, t.priceIdEnv || ""),
          disabled: false,
          kind: "teal" as const,
          requiresCheckout: true,
        };
      }

      return {
        text: "Upgrade to Command & Control",
        action: () => openCheckout(t.id, t.priceIdEnv || ""),
        disabled: false,
        kind: "gradient" as const,
        requiresCheckout: true,
      };
    }

    if (normalizedTier === "soc_pro") {
      if (t.id === "recon") {
        return null;
      }

      if (t.id === "soc_pro") {
        return {
          text: "Current Plan",
          action: () => {},
          disabled: true,
          kind: "disabled" as const,
          requiresCheckout: false,
        };
      }

      return {
        text: "Upgrade Now",
        action: () => openCheckout(t.id, t.priceIdEnv || ""),
        disabled: false,
        kind: "gradient" as const,
        requiresCheckout: true,
      };
    }

    if (normalizedTier === "command_control") {
      if (t.id === "command_control") {
        return {
          text: "Current Plan",
          action: () => {},
          disabled: true,
          kind: "disabled" as const,
          requiresCheckout: false,
        };
      }

      return null;
    }

    return null;
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to cancel subscription");
      }

      setUserTier("recon");
      setShowCancelModal(false);
      toast.success(
        "Subscription cancelled. You've been moved to the free Recon plan.",
      );

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel subscription",
      );
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans selection:bg-teal-500/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#0d1117]/80 backdrop-blur-md border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#e6edf3] font-bold text-xl tracking-tight"
          >
            <Shield className="w-6 h-6 text-teal-400" /> Phish-Slayer
          </Link>
          <div className="flex items-center gap-6">
            {!loadingConfig &&
              (isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="bg-teal-500 hover:bg-teal-400 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Command Center →
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="text-[#8b949e] hover:text-[#e6edf3] text-sm font-medium transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="bg-teal-500 hover:bg-teal-400 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Start Free
                  </Link>
                </>
              ))}
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="max-w-7xl mx-auto px-8 pt-20 pb-16 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-teal-400 font-semibold mb-8 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />{" "}
          BACK TO BASE
        </Link>
        <h1 className="text-4xl md:text-5xl font-black text-[#e6edf3] tracking-tight mb-4">
          Scalable Threat Intelligence
        </h1>
        <p className="text-[#8b949e] max-w-xl mx-auto text-lg mb-10">
          From independent researchers to global SOC teams, choose the tier that
          matches your security perimeter.
        </p>
      </header>

      {/* Pricing Grid */}
      <section className="max-w-7xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {tiers.map((t, i) => {
            const btn = getButtonConfig(t);
            const isCC = t.id === "command_control";
            const isFree = t.id === "recon";
            const normalizedTier = (userTier || "recon").toLowerCase();
            const showCancelSubscription =
              !loadingConfig &&
              isLoggedIn &&
              normalizedTier !== "recon" &&
              normalizedTier !== "free" &&
              normalizedTier === t.id;

            return (
              <div
                key={i}
                style={
                  isCC
                    ? {
                        border: "2px solid transparent",
                        background:
                          "linear-gradient(#161B22, #161B22) padding-box, linear-gradient(135deg, #2DD4BF, #A78BFA) border-box",
                        borderRadius: "16px",
                        transform: "scale(1.03)",
                        boxShadow: "0 0 40px rgba(45, 212, 191, 0.15)",
                      }
                    : {
                        border: "1px solid #30363D",
                        borderRadius: "16px",
                      }
                }
                className={`relative p-8 flex flex-col transition-all duration-300 bg-[#161B22] ${
                  isCC ? "z-20" : isFree ? "opacity-90" : ""
                }`}
              >
                {isCC && (
                  <div className="mb-3">
                    <div
                      style={{
                        background: "linear-gradient(135deg, #2DD4BF, #A78BFA)",
                        color: "white",
                        fontSize: "10px",
                        fontWeight: "bold",
                        letterSpacing: "2px",
                        textTransform: "uppercase",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        display: "inline-block",
                        marginBottom: "12px",
                      }}
                    >
                      MOST POWERFUL
                    </div>
                  </div>
                )}

                <h3 className="text-xl font-bold text-[#e6edf3] mb-2">
                  {t.name}
                </h3>
                <p className="text-[#8b949e] text-sm leading-relaxed mb-8">
                  {t.desc}
                </p>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-[#e6edf3]">
                      ${t.monthlyPrice}
                    </span>
                    <span className="text-[#8b949e] text-sm">/month</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {t.features.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      {f.ok ? (
                        <Check
                          className={`w-4 h-4 mt-0.5 shrink-0 ${isCC ? "text-[#A78BFA]" : "text-teal-400"}`}
                        />
                      ) : (
                        <X className="w-4 h-4 text-[#30363d] mt-0.5 shrink-0" />
                      )}
                      <span
                        className={`text-sm ${f.ok ? "text-[#e6edf3]" : "text-[#6e7681]"}`}
                      >
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {btn ? (
                  <button
                    onClick={btn.action}
                    disabled={
                      btn.disabled ||
                      loadingConfig ||
                      (btn.requiresCheckout && checkoutLoading === t.id) ||
                      (btn.requiresCheckout && !paddle) ||
                      (btn.requiresCheckout && paddleInitError)
                    }
                    style={
                      btn.kind === "disabled"
                        ? {
                            background: "#21262D",
                            color: "#8B949E",
                            border: "1px solid #30363D",
                            borderRadius: "6px",
                            width: "100%",
                            padding: "12px",
                          }
                        : btn.kind === "gradient"
                          ? {
                              background:
                                "linear-gradient(135deg, #2DD4BF, #A78BFA)",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              width: "100%",
                              padding: "12px",
                            }
                          : btn.kind === "teal"
                            ? {
                                background: "#2DD4BF",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                width: "100%",
                                padding: "12px",
                              }
                            : {
                                background: "transparent",
                                color: "#8B949E",
                                border: "1px solid #8B949E",
                                borderRadius: "6px",
                                width: "100%",
                                padding: "12px",
                              }
                    }
                    className={`text-sm font-bold transition-all ${btn.disabled ? "cursor-not-allowed" : "hover:opacity-90"}`}
                  >
                    {loadingConfig ||
                    (btn.requiresCheckout && checkoutLoading === t.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : btn.requiresCheckout && paddleInitError ? (
                      "Payment unavailable"
                    ) : btn.requiresCheckout && !paddle ? (
                      "Loading..."
                    ) : (
                      btn.text
                    )}
                  </button>
                ) : null}

                {showCancelSubscription ? (
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    disabled={cancelLoading}
                    className="mt-3 block w-full text-center text-sm text-[#2DD4BF] hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {cancelLoading ? "Cancelling..." : "Cancel Subscription"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {showCancelModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => (cancelLoading ? null : setShowCancelModal(false))}
          />

          <div className="relative w-full max-w-md rounded-xl border border-[#30363D] bg-[#161B22] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#E6EDF3] mb-3">
              Cancel Subscription
            </h3>
            <p className="text-sm text-[#8B949E] leading-relaxed">
              Are you sure you want to cancel? You'll lose access to paid
              features at the end of your billing period.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
                className="px-4 py-2 rounded-md border border-[#30363D] bg-transparent text-[#E6EDF3] text-sm font-semibold hover:bg-[#21262D] disabled:opacity-60"
              >
                Keep Plan
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="px-4 py-2 rounded-md bg-[#F85149] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {cancelLoading ? "Cancelling..." : "Cancel Subscription"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* FAQ */}
      <section className="bg-[#161b22]/50 border-t border-[#30363d] py-24">
        <div className="max-w-3xl mx-auto px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Deployment Intelligence
          </h2>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <div
                key={i}
                className="bg-[#161b22] border border-[#30363d] rounded-xl p-6"
              >
                <h4 className="text-[#e6edf3] font-semibold mb-2">{f.q}</h4>
                <p className="text-[#8b949e] text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-[#30363d] text-center text-xs text-[#6e7681]">
        © 2026 Phish-Slayer Platform. All rights reserved.
      </footer>
    </div>
  );
}
