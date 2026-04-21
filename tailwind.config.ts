import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1a56a0",
          50: "#eef5fc",
          100: "#d7e6f5",
          200: "#aecdeb",
          300: "#7eafdd",
          400: "#4c8ccc",
          500: "#2a6fb8",
          600: "#1a56a0",
          700: "#154382",
          800: "#123668",
          900: "#0f2c52",
        },
      },
    },
  },
  plugins: [],
};

export default config;
