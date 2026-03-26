"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface HeaderProps {
  isAuthenticated?: boolean;
}

export function Header({ isAuthenticated = false }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0D1117]/90 backdrop-blur-xl border-b border-[#30363D]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-[#2DD4BF] font-bold text-xl tracking-tight"
        >
          <Shield className="w-6 h-6" /> PHISH-SLAYER
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#8B949E]">
          <Link href="/#features" className="hover:text-[#E6EDF3] transition-colors">
            Features
          </Link>
          <Link href="/#how-it-works" className="hover:text-[#E6EDF3] transition-colors">
            How It Works
          </Link>
          <Link href="/pricing" className="hover:text-[#E6EDF3] transition-colors">
            Pricing
          </Link>
          <Link href="/api-docs" className="hover:text-[#E6EDF3] transition-colors">
            API Docs
          </Link>
          <Link href="/blog" className="hover:text-[#E6EDF3] transition-colors">
            Blog
          </Link>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="bg-[#2DD4BF] text-[#0D1117] hover:bg-[#2DD4BF]/90 font-bold px-6 py-2 rounded-full text-sm transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-[#8B949E] hover:text-[#E6EDF3] text-sm font-medium transition-colors border border-transparent hover:border-[#30363D] px-6 py-2 rounded-full"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-[#2DD4BF] text-[#0D1117] hover:bg-[#2DD4BF]/90 font-bold px-6 py-2 rounded-full text-sm transition-colors shadow-[0_0_20px_rgba(45,212,191,0.15)] hover:shadow-[0_0_20px_rgba(45,212,191,0.3)]"
              >
                Start Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-[#E6EDF3]"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-[#0D1117]/95 backdrop-blur-xl border-t border-[#30363D] px-6 pb-6 space-y-3 overflow-hidden"
          >
            <Link href="/#features" onClick={() => setMenuOpen(false)} className="block text-[#8B949E] py-2">Features</Link>
            <Link href="/#how-it-works" onClick={() => setMenuOpen(false)} className="block text-[#8B949E] py-2">How It Works</Link>
            <Link href="/pricing" onClick={() => setMenuOpen(false)} className="block text-[#8B949E] py-2">Pricing</Link>
            <Link href="/api-docs" onClick={() => setMenuOpen(false)} className="block text-[#8B949E] py-2">API Docs</Link>
            <Link href="/blog" onClick={() => setMenuOpen(false)} className="block text-[#8B949E] py-2">Blog</Link>
            
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="block bg-[#2DD4BF] text-[#0D1117] text-center py-2.5 rounded-full font-bold mt-2"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="block text-[#8B949E] py-2 text-center border border-[#30363D] rounded-full mt-2">
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setMenuOpen(false)}
                  className="block bg-[#2DD4BF] text-[#0D1117] text-center py-2.5 rounded-full font-bold mt-2"
                >
                  Start Free
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
