"use client";

import { useEffect, useState } from "react";
import { initializePaddle, Paddle } from "@paddle/paddle-js";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface PaddleCheckoutButtonProps {
  priceId: string;
  variant?: "primary" | "outline";
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function PaddleCheckoutButton({
  priceId,
  variant = "primary",
  children,
  className = "",
  style,
}: PaddleCheckoutButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [paddle, setPaddle] = useState<Paddle | undefined>(undefined);
  const [initError, setInitError] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setUserEmail(data.user.email);
      }
    });

    let active = true;
    const init = async () => {
      try {
        const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
        console.log("Initializing Paddle...");
        console.log("Token:", token ? "present" : "MISSING");

        if (!token) {
          setInitError(true);
          return;
        }

        const p = await initializePaddle({
          environment:
            process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
              ? "production"
              : "sandbox",
          token,
          eventCallback: function (event) {
            console.log("Paddle event:", event);
            if (event.name === "checkout.error") {
              console.error("Checkout error:", event.data);
            }
          },
        });

        if (active) {
          console.log("Paddle ready:", !!p);
          setPaddle(p || undefined);
          setInitError(!p);
        }
      } catch (error) {
        console.error("Paddle init failed:", error);
        if (active) setInitError(true);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [mounted]);

  const handleCheckout = () => {
    if (initError) {
      toast.error("Payment unavailable");
      return;
    }

    if (!paddle) {
      toast.error("Payment system loading. Please try again.");
      return;
    }
    openCheckout(paddle);
  };

  const openCheckout = (p: Paddle) => {
    setLoading(true);
    try {
      console.log("Opening Paddle checkout with priceId:", priceId);
      console.log("Paddle checkout debug:", {
        priceId,
        paddleEnv: process.env.NEXT_PUBLIC_PADDLE_ENV,
        token:
          process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.slice(0, 10) + "...",
        paddleReady: !!p,
      });
      p.Checkout.open({
        items: [
          {
            priceId: priceId,
            quantity: 1,
          },
        ],
        customer: userEmail
          ? {
              email: userEmail,
            }
          : undefined,
        settings: {
          displayMode: "overlay",
          theme: "dark",
          locale: "en",
        },
      });
    } catch (err) {
      console.error("Paddle Checkout Open Error:", err);
      toast.error("Failed to open checkout. Please try again.");
    } finally {
      setTimeout(() => setLoading(false), 3000);
    }
  };

  const baseStyles =
    "inline-flex justify-center items-center gap-2 font-bold text-[15px] px-8 py-3 rounded-full tracking-[0.01em] transition-all duration-200 disabled:opacity-50";
  const variants = {
    primary:
      "bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0D1117] hover:-translate-y-0.5 hover:shadow-lg",
    outline:
      "bg-transparent border border-white/10 hover:border-[#2DD4BF] text-[#E6EDF3] hover:text-[#2DD4BF] hover:-translate-y-0.5",
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={!mounted || loading || !paddle || initError}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      style={style}
    >
      {!mounted || (!initError && !paddle) ? "Loading..." : null}
      {initError ? "Payment unavailable" : null}
      {loading && paddle ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {mounted && paddle && !loading && !initError ? children : null}
    </button>
  );
}

