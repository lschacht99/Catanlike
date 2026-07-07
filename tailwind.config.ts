import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Hamsa Nomads palette: warm parchment with navy + terracotta.
        sand: "#f2ead9",
        cream: "#faf5e9",
        parchment: "#f6efdf",
        line: "#e3d7bd",
        ink: "#1e3a5f",
        "ink-soft": "#5a6b83",
        "ink-faint": "#8b96a8",
        rust: "#b45a37",
        olive: "#6b7f3e",
        gold: "#c9a227",
      },
      fontFamily: {
        display: ["Georgia", "'Times New Roman'", "serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(90, 70, 40, 0.08), 0 4px 16px rgba(90, 70, 40, 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
