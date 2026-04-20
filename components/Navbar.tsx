"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

const glassCard = "glass";

export default function Navbar() {
  const pathname = usePathname();

  if (pathname !== "/") {
    return null;
  }

  return (
    <nav
      className={`relative z-10 w-full max-w-7xl mx-auto px-6 py-4 mt-6 flex items-center justify-between ${glassCard} rounded-full`}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Shield className="w-4 h-4 text-black" />
        </div>
        <span className="font-space-grotesk font-bold text-xl tracking-tight text-white">
          Phish-Slayer
        </span>
      </div>

      <div className="hidden md:flex items-center gap-8">
        <a
          href="#features"
          className="text-sm font-medium text-white/70 transition-all duration-300 ease-out hover:text-white hover:scale-105 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] inline-block"
        >
          Features
        </a>
        <a
          href="#pricing"
          className="text-sm font-medium text-white/70 transition-all duration-300 ease-out hover:text-white hover:scale-105 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] inline-block"
        >
          Pricing
        </a>
        <a
          href="#company"
          className="text-sm font-medium text-white/70 transition-all duration-300 ease-out hover:text-white hover:scale-105 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] inline-block"
        >
          Company
        </a>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/auth/login"
          className="text-sm font-medium border border-white/20 text-white bg-transparent rounded-full px-5 py-2 transition-all duration-300 ease-out hover:bg-accent hover:text-black hover:shadow-[0_0_20px_rgba(0,212,170,0.4)] hidden md:block"
        >
          Log In
        </Link>
        <motion.div
          whileHover={{ scale: 1.05, filter: "brightness(1.1)" }}
          whileTap={{ scale: 0.95 }}
        >
          <Link
            href="/auth/signup"
            className="text-sm font-medium bg-primary text-white px-5 py-2 rounded-full transition-all duration-300 inline-block hover:shadow-[0_0_24px_rgba(124,106,247,0.45)]"
          >
            Sign Up
          </Link>
        </motion.div>
      </div>
    </nav>
  );
}
