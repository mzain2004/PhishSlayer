import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },
      colors: {
        background: "#080D12",
        foreground: "#FFFFFF",
        card: { DEFAULT: "#12151C", foreground: "#FFFFFF" },
        primary: { DEFAULT: "#7C5CFF", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#1A1E28", foreground: "#A1A7B3" },
        muted: { DEFAULT: "#12151C", foreground: "#A1A7B3" },
        accent: { DEFAULT: "#7C5CFF", foreground: "#FFFFFF" },
        border: "#30344A",
        input: "#0E1219",
        ring: "#7C5CFF",
        destructive: { DEFAULT: "#EF4444", foreground: "#FFFFFF" },
        danger: "#EF4444",
        warning: "#F97316",
        surface: "#12151C",
        base: "#080D12",
      },
      borderRadius: { lg: "8px", md: "6px", sm: "4px" },
      backgroundImage: {
        "accent-gradient": "linear-gradient(135deg, #7C5CFF, #A855F7)",
        "card-gradient": "linear-gradient(135deg, #12151C, #1A1E28)",
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        "pulse-ring": "pulse-ring 1.5s ease infinite",
        "fade-up": "fade-up 0.5s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
