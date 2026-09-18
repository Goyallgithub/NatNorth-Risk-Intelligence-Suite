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
          "purple-soft": "#F3EBF8",
          coral: "#E4002B",
          charcoal: "#1A1A1A",
          slate: "#2D2D2D",
          muted: "#6B6B6B",
          cream: "#FAFAF8",
          border: "#E8E4EC",
        },
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-archivo)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 4px 24px -4px rgba(90, 40, 125, 0.08), 0 2px 8px -2px rgba(0,0,0,0.04)",
        "card-hover": "0 12px 40px -8px rgba(90, 40, 125, 0.18), 0 4px 16px -4px rgba(0,0,0,0.06)",
        glass: "0 8px 32px rgba(90, 40, 125, 0.12)",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(90,40,125,0.14), transparent), radial-gradient(ellipse 50% 40% at 90% 10%, rgba(228,0,43,0.05), transparent)",
      },
    },
  },
  plugins: [],
};
export default config;
