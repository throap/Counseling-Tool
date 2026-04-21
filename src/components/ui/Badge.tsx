import type { HTMLAttributes } from "react";

type Tone = "neutral" | "sage" | "blue" | "success" | "warning" | "danger";

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-muted text-ink",
  sage:    "bg-sage-light text-sage-dark",
  blue:    "bg-seablue-light text-seablue-dark",
  success: "bg-sage-light text-sage-dark",
  warning: "bg-warning-light text-[color:var(--color-warning)]",
  danger:  "bg-danger-light text-[color:var(--color-danger)]",
};

export function Badge({ tone = "neutral", className = "", ...rest }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${TONES[tone]} ${className}`}
      {...rest}
    />
  );
}
