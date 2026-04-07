"use client";
import { motion } from "framer-motion";
import { CSSProperties, ReactNode } from "react";

type CardVariant = "stat" | "large" | "glass";

interface PhishCardProps {
  variant?: CardVariant;
  children: ReactNode;
  className?: string;
  hover?: boolean;
  [key: string]: any;
}

const cardStyles: Record<CardVariant, CSSProperties> = {
  stat: {
    background: "rgba(22,27,34,0.75)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(48,54,61,0.7)",
    borderRadius: 12,
    padding: 20,
  },
  large: {
    background: "rgba(22,27,34,0.80)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(48,54,61,0.7)",
    borderRadius: 16,
    padding: 24,
  },
  glass: {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
  },
};

export default function PhishCard({
  variant = "stat",
  children,
  className,
  hover = true,
  ...rest
}: PhishCardProps) {
  return (
    <motion.div
      style={cardStyles[variant]}
      whileHover={
        hover
          ? {
              scale: 1.02,
              boxShadow: "0 8px 32px rgba(45,212,191,0.12)",
              borderColor: "rgba(45,212,191,0.3)",
            }
          : {}
      }
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
