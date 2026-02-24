import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0B5563", // Deep Teal
          50: "#F0F7F8",
          100: "#DBECF0",
          200: "#ADD3DA",
          300: "#7AB7C2",
          400: "#4B9BA8",
          500: "#0B5563",
          600: "#09444F",
          700: "#07333B",
          800: "#052228",
          900: "#021114",
        },
        accent: {
          DEFAULT: "#D4AF37", // Rich Gold
          500: "#D4AF37",
          600: "#B8962A",
        },
      },
      fontFamily: {
        cabinet: ['"Cabinet Grotesk"', "sans-serif"],
        satoshi: ["Satoshi", "sans-serif"],
      },
      boxShadow: {
        glow: "0 8px 30px rgba(11, 85, 99, 0.3)",
        soft: "0 20px 40px -15px rgba(0,0,0,0.05)",
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
      },
      animation: {
        scan: "scan 3s ease-in-out infinite",
        float: "float 5s ease-in-out infinite",
        "slide-in-right": "slideInRight 0.5s ease-out forwards",
        "fade-in-up": "fadeInUp 0.4s ease-out forwards",
      },
      keyframes: {
        scan: {
          "0%": { top: "0%", opacity: "0" },
          "15%": { opacity: "1" },
          "85%": { opacity: "1" },
          "100%": { top: "100%", opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-15px)" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        fadeInUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
