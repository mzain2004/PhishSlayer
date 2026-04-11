"use client";
import React from "react";
import { motion, useMotionTemplate } from "framer-motion";

export const InfiniteGrid = ({
  mouseX,
  mouseY,
}: {
  mouseX: any;
  mouseY: any;
}) => {
  const gridOffsetX = 0;
  const gridOffsetY = 0;

  const maskImage = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <>
      <div className="absolute inset-0 z-0 opacity-[0.03]">
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </div>
      <motion.div
        className="absolute inset-0 z-0 opacity-20"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </motion.div>
    </>
  );
};

const GridPattern = ({
  offsetX,
  offsetY,
}: {
  offsetX: number;
  offsetY: number;
}) => (
  <svg className="w-full h-full">
    <defs>
      <pattern
        id="hero-grid-pattern"
        width="40"
        height="40"
        patternUnits="userSpaceOnUse"
        x={offsetX}
        y={offsetY}
      >
        <path
          d="M 40 0 L 0 0 0 40"
          fill="none"
          stroke="#2dd4bf"
          strokeWidth="1"
          opacity="0.5"
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#hero-grid-pattern)" />
  </svg>
);
