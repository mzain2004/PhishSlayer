"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Shield,
  Play,
  Network,
  Star,
  Twitter,
  Linkedin,
  Github,
  X,
  Search,
  Bell,
  LayoutDashboard,
  Terminal,
  ShieldAlert,
  CreditCard,
  Activity,
  Server,
  ArrowRight,
  CheckSquare,
  MessageSquare,
  Download,
  Settings,
  User,
  Key,
  Cpu,
  Lock,
  Camera,
  Apple,
  Laptop,
  Bug,
  MessageCircle,
  RefreshCw,
  AlertTriangle,
  FlaskConical,
  Monitor,
  Upload,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/utils/supabase/client";

const GlobalSupportWidget = dynamic(
  () => import("@/components/GlobalSupportWidget"),
  { ssr: false },
);

const glassCard = "glass";

const BlurText = ({
  text,
  className,
}: {
  text: string;
  className?: string;
}) => {
  const words = text.split(" ");
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.04 * i },
    }),
  };
  const child = {
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { type: "spring" as const, damping: 12, stiffness: 100 },
    },
    hidden: {
      opacity: 0,
      y: 50,
      filter: "blur(10px)",
      transition: { type: "spring" as const, damping: 12, stiffness: 100 },
    },
  };
  return (
    <motion.div
      style={{ display: "inline-flex", flexWrap: "wrap" }}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={className}
    >
      {words.map((word, index) => (
        <motion.span
          variants={child}
          style={{ marginRight: "0.25em" }}
          key={index}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const ScrollRevealText = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "center center"],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.15, 1]);
  return (
    <motion.div ref={ref} style={{ opacity }} className={className}>
      {children}
    </motion.div>
  );
};

const staggerGrid = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const gridItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const tactileProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

const AuthModal = ({
  initialView,
  onClose,
}: {
  initialView: string;
  onClose: () => void;
}) => {
  const [view, setView] = useState(initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const redirectBase =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const loginWithOAuth = async (provider: "google" | "github") => {
    setError(null);
    setLoading(true);
    // Clerk handles OAuth now
    /*
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${redirectBase}/auth/callback` },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
    */
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    setSignupSuccess(true);
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email
    );
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    setResetSent(true);
    setView("reset");
    setLoading(false);
  };

  return (
    <div
      className={`relative w-full max-w-md p-8 ${glassCard} flex flex-col`}
      onClick={(e) => e.stopPropagation()}
    >
      <motion.button
        {...tactileProps}
        onClick={onClose}
        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </motion.button>

      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Shield className="w-4 h-4 text-black" />
        </div>
        <span className="font-space-grotesk font-bold text-xl tracking-tight text-white">
          Phish-Slayer
        </span>
      </div>

      {view === "login" && (
        <>
          <h2 className="font-space-grotesk text-2xl font-bold text-white mb-2 text-center">
            Welcome back
          </h2>
          <p className="text-white/50 text-center mb-6 text-sm">
            Log in to your account to continue
          </p>

          <div className="flex flex-col gap-4 mb-6">
            <motion.button
              {...tactileProps}
              disabled={loading}
              onClick={() => loginWithOAuth("google")}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition-colors disabled:opacity-60"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </motion.button>
            <motion.button
              {...tactileProps}
              disabled={loading}
              onClick={() => loginWithOAuth("github")}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#24292F] text-white font-medium hover:bg-[#24292F]/90 transition-colors disabled:opacity-60"
            >
              <Github className="w-5 h-5" />
              Continue with GitHub
            </motion.button>
          </div>

          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <span className="relative bg-[#050505] px-4 text-xs text-white/50 uppercase">
              Or continue with email
            </span>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors"
            />
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  className="rounded border-white/10 bg-black/50 text-accent focus:ring-accent/50"
                />
                Remember me
              </label>
              <motion.button
                {...tactileProps}
                type="button"
                onClick={() => {
                  setError(null);
                  setView("forgot");
                }}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                Forgot password?
              </motion.button>
            </div>
            {error ? (
              <p className="text-xs text-red-400 border border-red-500/20 bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            ) : null}
            <motion.button
              whileHover={{
                scale: 1.02,
                backgroundColor: "#6e5df0",
                boxShadow: "0 0 15px rgba(124,106,247,0.5)",
              }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-semibold py-2.5 rounded-lg transition-colors duration-300 mt-2 disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log In"}
            </motion.button>
          </form>

          <p className="text-center text-sm text-white/50 mt-6">
            Don&apos;t have an account?{" "}
            <motion.button
              {...tactileProps}
              onClick={() => {
                setError(null);
                setSignupSuccess(false);
                setView("signup");
              }}
              className="text-accent hover:text-accent/80 transition-colors font-medium"
            >
              Sign up
            </motion.button>
          </p>
        </>
      )}

      {view === "signup" && (
        <>
          <h2 className="font-space-grotesk text-2xl font-bold text-white mb-2 text-center">
            Create an account
          </h2>
          <p className="text-white/50 text-center mb-6 text-sm">
            Join Phish-Slayer today
          </p>

          {signupSuccess ? (
            <div className="mb-4 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent text-center">
              Check your email to confirm your account
            </div>
          ) : null}

          <div className="flex flex-col gap-4 mb-6">
            <button
              onClick={() => loginWithOAuth("google")}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign up with Google
            </button>
            <button
              onClick={() => loginWithOAuth("github")}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#24292F] text-white font-medium hover:bg-[#24292F]/90 transition-colors"
            >
              <Github className="w-5 h-5" />
              Sign up with GitHub
            </button>
          </div>

          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <span className="relative bg-[#050505] px-4 text-xs text-white/50 uppercase">
              Or continue with email
            </span>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSignup}>
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors"
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors"
            />
            {error ? (
              <p className="text-xs text-red-400 border border-red-500/20 bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            ) : null}
            <motion.button
              whileHover={{
                scale: 1.02,
                backgroundColor: "#6e5df0",
                boxShadow: "0 0 15px rgba(124,106,247,0.5)",
              }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-semibold py-2.5 rounded-lg transition-colors duration-300 mt-2 disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create Account"}
            </motion.button>
          </form>

          <p className="text-center text-sm text-white/50 mt-6">
            Already have an account?{" "}
            <button
              onClick={() => {
                setError(null);
                setView("login");
              }}
              className="text-accent hover:text-accent/80 transition-colors font-medium"
            >
              Log in
            </button>
          </p>
        </>
      )}

      {view === "forgot" && (
        <>
          <h2 className="font-space-grotesk text-2xl font-bold text-white mb-2 text-center">
            Reset password
          </h2>
          <p className="text-white/50 text-center mb-6 text-sm">
            Enter your email to receive a reset link
          </p>

          <form className="flex flex-col gap-4" onSubmit={handleForgot}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors"
            />
            {error ? (
              <p className="text-xs text-red-400 border border-red-500/20 bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            ) : null}
            <motion.button
              whileHover={{
                scale: 1.02,
                backgroundColor: "#6e5df0",
                boxShadow: "0 0 15px rgba(124,106,247,0.5)",
              }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-semibold py-2.5 rounded-lg transition-colors duration-300 mt-2 disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </motion.button>
          </form>

          <p className="text-center text-sm text-white/50 mt-6">
            Remember your password?{" "}
            <button
              onClick={() => setView("login")}
              className="text-accent hover:text-accent/80 transition-colors font-medium"
            >
              Log in
            </button>
          </p>
        </>
      )}

      {view === "reset" && (
        <>
          <h2 className="font-space-grotesk text-2xl font-bold text-white mb-2 text-center">
            Check your email
          </h2>
          <p className="text-white/50 text-center mb-6 text-sm">
            {resetSent
              ? "Reset link sent to your email"
              : "We've sent a password reset link to your email address."}
          </p>

          <button
            onClick={() => setView("login")}
            className="w-full bg-white/10 text-white font-semibold py-2.5 rounded-lg hover:bg-white/20 transition-colors mt-2"
          >
            Back to Log In
          </button>
        </>
      )}
    </div>
  );
};

export default function Home() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState("login");
  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary opacity-20 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-accent opacity-20 blur-[150px]" />
        <div className="absolute top-[30%] left-[50%] w-[40vw] h-[40vw] rounded-full bg-primary opacity-10 blur-[150px]"></div>
      </div>

      {/* Navbar */}
      <nav
        className={`w-full max-w-7xl mx-auto px-6 py-4 mt-6 flex items-center justify-between ${glassCard} rounded-full`}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Shield className="w-4 h-4 text-black" />
          </div>
          <span className="font-space-grotesk font-bold text-xl tracking-tight">
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
          <button
            onClick={() => {
              setAuthIntent("login");
              setIsAuthOpen(true);
            }}
            className="text-sm font-medium border border-white/20 text-white bg-transparent rounded-full px-5 py-2 transition-all duration-300 ease-out hover:bg-accent hover:text-black hover:shadow-[0_0_20px_rgba(0,212,170,0.4)] hidden md:block"
          >
            Log In
          </button>
          <motion.button
            whileHover={{ scale: 1.05, filter: "brightness(1.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setAuthIntent("signup");
              setIsAuthOpen(true);
            }}
            className="text-sm font-medium bg-primary text-white px-5 py-2 rounded-full transition-all duration-300"
          >
            Sign Up
          </motion.button>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        whileHover={{
          filter: "drop-shadow(0 0 60px rgba(167, 139, 250, 0.15))",
        }}
        className="w-full max-w-5xl mx-auto px-6 pt-32 pb-24 flex flex-col items-center text-center transition-all duration-700"
      >
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 ${glassCard}`}
        >
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          <span className="text-sm font-medium text-white/80">
            AI Threat Detection Active
          </span>
        </div>

        <motion.h1
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="font-space-grotesk text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight uppercase"
        >
          Neutralize threats instantly.
          <br />
          Eliminate dwell time forever.
        </motion.h1>

        <p className="text-lg md:text-xl text-white/70 max-w-3xl mb-10 leading-relaxed">
          Experience immediate, automated defense with real-time visibility,
          eliminating risks before impact.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <motion.button
            {...tactileProps}
            onClick={() => {
              setAuthIntent("signup");
              setIsAuthOpen(true);
            }}
            className="bg-primary text-white font-semibold px-8 py-4 rounded-full transition-all duration-300 flex items-center gap-2 group hover:bg-primary/90"
          >
            ACTIVATE FREE TRIAL NOW
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.button>
          <motion.button
            {...tactileProps}
            className={`px-8 py-4 rounded-full font-medium hover:bg-white/10 transition-all flex items-center gap-2 ${glassCard}`}
          >
            <Play className="w-4 h-4" />
            WATCH DEMO
          </motion.button>
        </div>
      </motion.section>

      {/* Our Process */}
      <section className="w-full max-w-7xl mx-auto px-6 py-24">
        <h2 className="font-space-grotesk text-3xl md:text-4xl font-bold text-center mb-16 uppercase tracking-widest">
          Our Process
        </h2>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={staggerGrid}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            {
              num: "01",
              title: "Detection",
              desc: "Scan & Spot early threats with AI-powered speed.",
            },
            {
              num: "02",
              title: "Isolation",
              desc: "Contain suspicious activity automatically to prevent spread.",
            },
            {
              num: "03",
              title: "Analysis",
              desc: "Deep dive into threat behavior for actionable intel.",
            },
            {
              num: "04",
              title: "Neutralization",
              desc: "Eliminate risks and fortify your defenses.",
            },
          ].map((step, index) => (
            <motion.div
              variants={gridItem}
              {...tactileProps}
              key={step.num || index}
              className={`p-8 flex flex-col ${glassCard} hover:bg-white/10 transition-colors`}
            >
              <span
                key={`step-num-${step.num || index}`}
                className="font-space-grotesk text-5xl font-light text-white/20 mb-6"
              >
                {step.num}
              </span>
              <h3
                key={`step-title-${step.num || index}`}
                className="font-space-grotesk text-2xl font-bold text-white mb-3"
              >
                {step.title}
              </h3>
              <p
                key={`step-desc-${step.num || index}`}
                className="text-white/70 leading-relaxed"
              >
                {step.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Our Purpose */}
      <section className="w-full max-w-5xl mx-auto px-6 py-24 flex flex-col items-center text-center">
        <h2 className="font-space-grotesk text-3xl md:text-4xl font-bold mb-6 uppercase tracking-widest">
          Our Purpose
        </h2>
        <p className="text-white/70 max-w-2xl mb-16">
          To secure your digital future by eliminating threats at the source,
          creating a world where cyber safety is seamless and proactive for
          everyone.
        </p>

        <div className="relative w-full max-w-3xl aspect-[2/1] mb-12 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10"></div>
          <Image
            src="https://picsum.photos/seed/team/1200/600"
            alt="Team"
            fill
            className="object-cover opacity-60 grayscale"
            referrerPolicy="no-referrer"
          />
        </div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={staggerGrid}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl relative z-20 -mt-24"
        >
          <motion.div
            key="mission-card"
            variants={gridItem}
            {...tactileProps}
            className={`p-8 text-left ${glassCard}`}
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-6">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-space-grotesk text-2xl font-bold text-white mb-3">
              Our Mission
            </h3>
            <p className="text-white/70">
              To secure your digital future by eliminating threats at the
              source.
            </p>
          </motion.div>
          <motion.div
            key="vision-card"
            variants={gridItem}
            {...tactileProps}
            className={`p-8 text-left ${glassCard}`}
          >
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mb-6">
              <Network className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-space-grotesk text-2xl font-bold text-white mb-3">
              Our Vision
            </h3>
            <p className="text-white/70">
              A world where cyber safety is seamless and proactive for everyone.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* What Our Users Say */}
      <section className="w-full max-w-7xl mx-auto px-6 py-24">
        <h2 className="font-space-grotesk text-3xl md:text-4xl font-bold text-center mb-16 uppercase tracking-widest">
          What Our Users Say
        </h2>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={staggerGrid}
          className="flex flex-col md:flex-row items-center justify-center gap-6"
        >
          {/* Left Card (Faded) */}
          <motion.div
            key="testimonial-left"
            variants={gridItem}
            className={`p-6 w-full md:w-1/3 opacity-50 scale-95 ${glassCard}`}
          >
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-accent text-accent" />
              ))}
            </div>
            <p className="text-white/70 mb-6 line-clamp-3">
              &quot;Incredible visibility into our network. We spotted anomalies
              we never would have seen otherwise.&quot;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20"></div>
              <div>
                <div className="font-medium text-white">Sarah Jenkins</div>
                <div className="text-xs text-white/50">CISO, TechCorp</div>
              </div>
            </div>
          </motion.div>

          {/* Center Card (Active) */}
          <motion.div
            key="testimonial-center"
            variants={gridItem}
            {...tactileProps}
            className={`p-8 w-full md:w-1/3 z-10 border-primary/30 ${glassCard}`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                ))}
              </div>
              <span className="text-xs font-bold bg-primary/20 text-primary px-2 py-1 rounded">
                G2
              </span>
            </div>
            <p className="text-xl font-medium text-white mb-8 leading-relaxed">
              &quot;Phish-Slayer instantly found and stopped a major attack. Our
              team is finally secure!&quot;
            </p>
            <div className="flex items-center gap-4">
              <Image
                src="https://picsum.photos/seed/avatar1/100/100"
                alt="Tomas Faster"
                width={48}
                height={48}
                className="rounded-full"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="font-bold text-white">Tomas Faster</div>
                <div className="text-sm text-white/50">Director of IT</div>
              </div>
            </div>
          </motion.div>

          {/* Right Card (Faded) */}
          <motion.div
            key="testimonial-right"
            variants={gridItem}
            className={`p-6 w-full md:w-1/3 opacity-50 scale-95 ${glassCard}`}
          >
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-accent text-accent" />
              ))}
            </div>
            <p className="text-white/70 mb-6 line-clamp-3">
              &quot;The automated playbooks have reduced our MTTR by 80%.
              It&apos;s like having another analyst on the team.&quot;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20"></div>
              <div>
                <div className="font-medium text-white">Michael Chen</div>
                <div className="text-xs text-white/50">SecOps Lead</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <div className="flex justify-center gap-2 mt-8">
          <div className="w-2 h-2 rounded-full bg-white/20"></div>
          <div className="w-6 h-2 rounded-full bg-accent"></div>
          <div className="w-2 h-2 rounded-full bg-white/20"></div>
          <div className="w-2 h-2 rounded-full bg-white/20"></div>
        </div>
      </section>

      {/* Live Threat Monitoring */}
      <section className="w-full max-w-5xl mx-auto px-6 py-24 flex flex-col items-center">
        <h2 className="font-space-grotesk text-3xl md:text-4xl font-bold text-center mb-4 uppercase tracking-widest">
          Live Threat Monitoring
        </h2>
        <p className="text-white/70 text-center mb-12">
          Monitor your entire security posture in real-time with our interactive
          dashboard.
        </p>

        <motion.div {...tactileProps} className={`w-full p-2 ${glassCard}`}>
          <div className="w-full aspect-[16/9] rounded-xl bg-black/50 border border-white/5 relative overflow-hidden flex items-center justify-center">
            {/* Mock Dashboard UI */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-accent"></div>
              </div>
              <div className="bg-white/10 px-4 py-1 rounded-full text-xs text-white/50 border border-white/5">
                Threat Landscape View
              </div>
            </div>

            {/* Abstract Network Graph Mock */}
            <div className="relative w-full h-full flex items-center justify-center opacity-80">
              <div className="absolute w-64 h-64 rounded-full border border-primary/30"></div>
              <div className="absolute w-96 h-96 rounded-full border border-accent/20"></div>
              <div className="absolute w-32 h-32 rounded-full bg-primary/10 blur-xl"></div>
              <Network className="w-16 h-16 text-accent relative z-10" />

              {/* Nodes */}
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                  style={{
                    top: `${(50 + 35 * Math.sin((i * 30 * Math.PI) / 180)).toFixed(4)}%`,
                    left: `${(50 + 35 * Math.cos((i * 30 * Math.PI) / 180)).toFixed(4)}%`,
                  }}
                >
                  {i % 3 === 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary/40"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Choose Your Plan */}
      <section id="pricing" className="w-full max-w-6xl mx-auto px-6 py-24">
        <h2 className="font-space-grotesk text-3xl md:text-4xl font-bold text-center mb-16 uppercase tracking-widest">
          Choose Your Plan
        </h2>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={staggerGrid}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center"
        >
          {/* Starter */}
          <motion.div
            key="plan-starter"
            variants={gridItem}
            {...tactileProps}
            className={`p-8 ${glassCard}`}
          >
            <h3 className="font-space-grotesk text-2xl font-bold text-white mb-2">
              Starter
            </h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-white">$0</span>
              <span className="text-white/50">/month</span>
            </div>
            <p className="text-white/70 mb-8 h-12">
              Get started with essential protection.
            </p>
            <motion.button
              onClick={() => {
                setAuthIntent("signup");
                setIsAuthOpen(true);
              }}
              {...tactileProps}
              className="w-full py-3 rounded-full border border-white/20 text-white hover:bg-white/5 transition-colors font-medium"
            >
              Get Started
            </motion.button>
          </motion.div>

          {/* Pro */}
          <motion.div
            key="plan-pro"
            variants={gridItem}
            {...tactileProps}
            className={`p-8 relative transform md:-translate-y-4 border-primary/50 shadow-[0_0_30px_rgba(124,106,247,0.2)] ${glassCard}`}
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Most Popular
            </div>
            <h3 className="font-space-grotesk text-2xl font-bold text-white mb-2">
              Pro
            </h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-bold text-white">$20</span>
              <span className="text-white/50">/month</span>
            </div>
            <p className="text-white/70 mb-8 h-12">
              Advanced features for growing teams.
            </p>
            <motion.button
              onClick={() => {
                setAuthIntent("signup");
                setIsAuthOpen(true);
              }}
              {...tactileProps}
              className="w-full py-3 rounded-full bg-primary text-white transition-all duration-300 font-bold hover:bg-primary/90"
            >
              Start Free Trial
            </motion.button>
          </motion.div>

          {/* Enterprise */}
          <motion.div
            key="plan-enterprise"
            variants={gridItem}
            {...tactileProps}
            className={`p-8 ${glassCard}`}
          >
            <h3 className="font-space-grotesk text-2xl font-bold text-white mb-2">
              Enterprise
            </h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-white">$250</span>
              <span className="text-white/50">/month</span>
            </div>
            <p className="text-white/70 mb-8 h-12">
              Full scale protection and support.
            </p>
            <motion.button
              {...tactileProps}
              className="w-full py-3 rounded-full border border-white/20 text-white hover:bg-white/5 transition-colors font-medium"
            >
              Contact Sales
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="w-full max-w-5xl mx-auto px-6 py-12 mb-24">
        <motion.div
          {...tactileProps}
          className={`p-12 md:p-16 flex flex-col items-center text-center ${glassCard} relative overflow-hidden`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"></div>
          <h2 className="font-space-grotesk text-3xl md:text-5xl font-bold text-white mb-4 relative z-10 uppercase tracking-tight">
            Secure Your Future Today
          </h2>
          <p className="text-white/70 mb-10 relative z-10 text-lg">
            Secure your organization today. Join thousands of protected users.
          </p>

          <div className="flex flex-col sm:flex-row w-full max-w-md gap-3 relative z-10">
            <input
              type="email"
              placeholder="Enter email"
              className="flex-1 bg-black/50 border border-white/10 rounded-full px-6 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
            />
            <motion.button
              onClick={() => {
                setAuthIntent("signup");
                setIsAuthOpen(true);
              }}
              {...tactileProps}
              className="bg-primary text-white font-semibold px-8 py-3 rounded-full transition-all duration-300 whitespace-nowrap hover:bg-primary/90 hover:shadow-[0_0_15px_rgba(124,106,247,0.45)]"
            >
              Sign Up Free
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#050505] border-t border-white/5 pt-20 pb-10 px-6 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={staggerGrid}
          className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16"
        >
          {/* Brand & Desc */}
          <motion.div
            key="footer-brand"
            variants={gridItem}
            className="lg:col-span-2"
          >
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-6 h-6 text-white" />
              <span className="font-space-grotesk font-bold text-2xl tracking-tight text-white">
                Phish-Slayer
              </span>
            </div>
            <p className="text-white/60 max-w-sm leading-relaxed">
              Cut MTTR and secure your enterprise with identity-first incident
              response and automation.
            </p>
          </motion.div>

          {/* Product Links */}
          <motion.div key="footer-product" variants={gridItem}>
            <h4 className="font-bold text-white mb-6">Product</h4>
            <ul className="space-y-4">
              <li>
                <motion.a
                  {...tactileProps}
                  href="#"
                  className="text-white/60 hover:text-accent transition-colors inline-block"
                >
                  Features
                </motion.a>
              </li>
              <li>
                <motion.a
                  {...tactileProps}
                  href="#"
                  className="text-white/60 hover:text-accent transition-colors inline-block"
                >
                  AI Agent
                </motion.a>
              </li>
              <li>
                <motion.a
                  {...tactileProps}
                  href="#"
                  className="text-white/60 hover:text-accent transition-colors inline-block"
                >
                  Protocols
                </motion.a>
              </li>
              <li>
                <motion.a
                  {...tactileProps}
                  href="#"
                  className="text-white/60 hover:text-accent transition-colors inline-block"
                >
                  Dashboard
                </motion.a>
              </li>
            </ul>
          </motion.div>

          {/* Resources Links */}
          <motion.div key="footer-resources" variants={gridItem}>
            <h4 className="font-bold text-white mb-6">Resources</h4>
            <ul className="space-y-4">
              <li>
                <motion.a
                  {...tactileProps}
                  href="#"
                  className="text-white/60 hover:text-accent transition-colors inline-block"
                >
                  Docs
                </motion.a>
              </li>
              <li>
                <motion.a
                  {...tactileProps}
                  href="#pricing"
                  className="text-white/60 hover:text-accent transition-colors inline-block"
                >
                  Pricing
                </motion.a>
              </li>
              <li>
                <motion.a
                  {...tactileProps}
                  href="#"
                  className="text-white/60 hover:text-accent transition-colors inline-block"
                >
                  Blog
                </motion.a>
              </li>
              <li>
                <motion.a
                  {...tactileProps}
                  href="#"
                  className="text-white/60 hover:text-accent transition-colors inline-block"
                >
                  Support
                </motion.a>
              </li>
            </ul>
          </motion.div>

          {/* Legal & Contact */}
          <motion.div key="footer-legal" variants={gridItem}>
            <h4 className="font-bold text-white mb-6">Legal & Contact</h4>
            <ul className="space-y-4 mb-8">
              <li>
                <motion.a
                  {...tactileProps}
                  href="/privacy"
                  className="text-white/60 hover:text-accent transition-colors inline-block"
                >
                  Privacy
                </motion.a>
              </li>
              <li>
                <motion.a
                  {...tactileProps}
                  href="/terms"
                  className="text-white/60 hover:text-accent transition-colors inline-block"
                >
                  Terms
                </motion.a>
              </li>
            </ul>
            <div className="flex gap-4 mb-8">
              <motion.a
                {...tactileProps}
                href="#"
                className="text-white/60 hover:text-white transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </motion.a>
              <motion.a
                {...tactileProps}
                href="#"
                className="text-white/60 hover:text-white transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </motion.a>
              <motion.a
                {...tactileProps}
                href="#"
                className="text-white/60 hover:text-white transition-colors"
              >
                <Github className="w-5 h-5" />
              </motion.a>
            </div>

            <h4 className="font-bold text-white mb-4 text-sm">Subscribe</h4>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email address"
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 w-full"
              />
              <motion.button
                {...tactileProps}
                className="bg-primary text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_15px_rgba(124,106,247,0.45)]"
              >
                Subscribe
              </motion.button>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Bar */}
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10 text-sm text-white/40">
          <p>© 2026 Phish-Slayer, Inc. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="/terms" className="hover:text-white transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {isAuthOpen && (
          <motion.div
            key="auth-modal"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setIsAuthOpen(false)}
          >
            <AuthModal
              initialView={authIntent}
              onClose={() => setIsAuthOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <GlobalSupportWidget key="global-support-widget" />
    </main>
  );
}
