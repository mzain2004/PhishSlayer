import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        background: "#000000",
        foreground: "#ffffff",
        card: "#050505",
        cardBorder: "rgba(255, 255, 255, 0.12)",
        accent: "#00d4aa",
        primary: "#7c6af7",
        danger: "#ff4d4f",
        warning: "#f5a623",
        surface: "rgba(255,255,255,0.05)",
        base: "#0a0a0f",
      },
    },
  },
  plugins: [],
};

export default config;
