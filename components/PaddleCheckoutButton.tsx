'use client';

import { useEffect, useState } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PaddleCheckoutButtonProps {
  priceId: string;
  variant?: 'primary' | 'outline';
  children: React.ReactNode;
  className?: string;
}

export default function PaddleCheckoutButton({
  priceId,
  variant = 'primary',
  children,
  className = '',
}: PaddleCheckoutButtonProps) {
  const [paddle, setPaddle] = useState<Paddle | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const p = await initializePaddle({
          environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production') || 'sandbox',
          token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '',
        });
        setPaddle(p);
      } catch (error) {
        console.error('Failed to initialize Paddle:', error);
      }
    };
    init();
  }, []);

  const handleCheckout = () => {
    if (!paddle) {
      setLoading(true);
      setTimeout(() => {
        if (!paddle) {
          toast.error('Payment system is initializing. Please try again in 2 seconds.');
          setLoading(false);
        } else {
          openCheckout(paddle);
        }
      }, 1000);
      return;
    }
    openCheckout(paddle);
  };

  const openCheckout = (p: Paddle) => {
    setLoading(true);
    p.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      settings: {
        displayMode: 'overlay',
        theme: 'dark',
        locale: 'en',
      },
    });
    
    setTimeout(() => setLoading(false), 3000);
  };

  const baseStyles = "inline-flex justify-center items-center gap-2 font-bold text-[15px] px-10 py-4 rounded-full tracking-[0.01em] transition-all disabled:opacity-50";
  const variants = {
    primary: "bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0D1117] hover:-translate-y-[1px] hover:shadow-[0_8px_25px_rgba(45,212,191,0.3)]",
    outline: "bg-transparent border border-[#30363D] hover:border-[#2DD4BF] text-[#E6EDF3] hover:text-[#2DD4BF]"
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
}
