"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";
import LoginModal from "@/components/auth/LoginModal";
import SignupModal from "@/components/auth/SignupModal";

type AuthModalView = "login" | "signup" | "forgot";

type AuthModalEntryProps = {
  defaultModal: AuthModalView;
};

export default function AuthModalEntry({ defaultModal }: AuthModalEntryProps) {
  const [isAuthOpen, setIsAuthOpen] = useState(true);
  const [view, setView] = useState<AuthModalView>(defaultModal);

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center bg-slate-950">
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.6, 0.8, 0.6],
            x: [0, 20, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-cyan-500 opacity-20 blur-[150px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.6, 0.8, 0.6],
            x: [0, -20, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-teal-500 opacity-20 blur-[150px]"
        />
        <div className="absolute top-[30%] left-[50%] w-[40vw] h-[40vw] rounded-full bg-slate-800 opacity-40 blur-[150px]" />
      </div>

      <AnimatePresence>
        {isAuthOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => setIsAuthOpen(false)}
          >
            {view === "login" ? (
              <LoginModal
                onClose={() => setIsAuthOpen(false)}
                onSwitchToSignup={() => setView("signup")}
                onSwitchToForgot={() => setView("forgot")}
              />
            ) : null}

            {view === "signup" ? (
              <SignupModal
                onClose={() => setIsAuthOpen(false)}
                onSwitchToLogin={() => setView("login")}
              />
            ) : null}

            {view === "forgot" ? (
              <ForgotPasswordModal
                onClose={() => setIsAuthOpen(false)}
                onSwitchToLogin={() => setView("login")}
              />
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
