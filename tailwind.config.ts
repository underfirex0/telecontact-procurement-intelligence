import type { Config } from "tailwindcss";

/**
 * Telecontact Intelligence design tokens.
 * Ink = deep navy typography, Line = hairline borders, Accent = restrained corporate blue.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ['"Source Serif 4 Variable"', "Georgia", "serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#0B1E36",
          900: "#0B1E36",
          800: "#16304F",
          700: "#2B4566",
          600: "#46607F",
          500: "#64799A",
          400: "#8A9BB4",
          300: "#B3C0D1",
        },
        line: { DEFAULT: "#E3E7EE", strong: "#CDD4DF", soft: "#EEF1F5" },
        canvas: { DEFAULT: "#F6F7F9", raised: "#FFFFFF", sunken: "#F0F2F6" },
        accent: { DEFAULT: "#2563A8", 50: "#EEF4FB", 100: "#DCE8F6", 600: "#2563A8", 700: "#1C4F89", 800: "#163F6E" },
        signal: {
          good: "#1F7A4D", goodbg: "#EAF5EF",
          warn: "#A86A06", warnbg: "#FBF3E4",
          bad: "#B3373F", badbg: "#FBECEC",
          info: "#2563A8", infobg: "#EEF4FB",
        },
      },
      fontSize: {
        "2xs": ["10.5px", { lineHeight: "14px", letterSpacing: "0.04em" }],
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "19px" }],
        base: ["14px", { lineHeight: "21px" }],
      },
      boxShadow: {
        hair: "0 0 0 1px #E3E7EE",
        pop: "0 8px 24px -8px rgba(11,30,54,0.18), 0 0 0 1px rgba(11,30,54,0.06)",
      },
      keyframes: {
        fadein: { from: { opacity: "0", transform: "translateY(2px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: { fadein: "fadein 160ms ease-out" },
    },
  },
  plugins: [],
};
export default config;
