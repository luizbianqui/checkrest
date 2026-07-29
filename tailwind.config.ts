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
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          primary: "#0f172a", // Slate 900
          success: "#10b981", // Emerald 500
          alert: "#ef4444",   // Red 500
          bg: "#f8fafc",      // Screen background
        },
      },
    },
  },
  plugins: [],
};
export default config;
