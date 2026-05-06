import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          0: "#0B0F14",
          50: "#0F141A",
          100: "#161D26",
          200: "#1E2733",
          300: "#2A3441",
          400: "#3A4654",
          500: "#5A6677",
          600: "#8B95A4",
          700: "#B5BCC7",
          800: "#D5D9DF",
          900: "#F4F4F5",
        },
        accent: {
          DEFAULT: "#FF9900",
          50: "#FFF6E6",
          100: "#FFE3B3",
          200: "#FFCD80",
          300: "#FFB84D",
          400: "#FFA61A",
          500: "#FF9900",
          600: "#CC7A00",
          700: "#995C00",
        },
        teal: {
          DEFAULT: "#0FB5BA",
          400: "#22D3D9",
          500: "#0FB5BA",
          600: "#0A8A8E",
        },
      },
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
    },
  },
  plugins: [],
} satisfies Config;
