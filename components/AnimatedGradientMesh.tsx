"use client";

import { motion } from "framer-motion";

export default function AnimatedGradientMesh() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none">
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.8, 0.6], x: [0, 20, 0], y: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#A78BFA] opacity-20 blur-[150px]"
      ></motion.div>
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.8, 0.6], x: [0, -20, 0], y: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#2DD4BF] opacity-20 blur-[150px]"
      ></motion.div>
      <div className="absolute top-[30%] left-[50%] w-[40vw] h-[40vw] rounded-full bg-[#A78BFA] opacity-10 blur-[150px]"></div>
    </div>
  );
}
