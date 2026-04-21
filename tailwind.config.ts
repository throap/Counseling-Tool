import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
      },
      colors: {
        bg: "var(--color-bg)",
        surface: {
          DEFAULT: "var(--color-surface)",
          muted: "var(--color-surface-muted)",
        },
        ink: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
          subtle: "var(--color-text-subtle)",
        },
        sage: {
          DEFAULT: "var(--color-sage)",
          dark: "var(--color-sage-dark)",
          light: "var(--color-sage-light)",
        },
        seablue: {
          DEFAULT: "var(--color-blue)",
          dark: "var(--color-blue-dark)",
          light: "var(--color-blue-light)",
        },
        success: "var(--color-success)",
        warning: {
          DEFAULT: "var(--color-warning)",
          light: "var(--color-warning-light)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          light: "var(--color-danger-light)",
        },
        line: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        lifted: "var(--shadow-lifted)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
