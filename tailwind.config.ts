import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        natnorth: {
          purple: "#5A287D",
          "purple-dark": "#3D1A56",
          "purple-light": "#7B4A9E",
          "purple-soft": "#2A1040",
          coral: "#FF4D5E",
          charcoal: "#12061F",
          slate: "#E8E0F0",
          muted: "rgba(255,255,255,0.55)",
          cream: "#1A0A2E",
          border: "rgba(255,255,255,0.22)",
        },
      },
      fontFamily: {
        sans: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-mono)", "ui-monospace", "monospace"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        note: ["var(--font-note)", "cursive"],
      },
    },
  },
  plugins: [],
};
export default config;
