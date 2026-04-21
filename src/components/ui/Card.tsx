import type { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
}

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  padding = "md",
  interactive = false,
  className = "",
  ...rest
}: Props) {
  const interactiveCls = interactive
    ? "hover:shadow-lifted hover:-translate-y-0.5 cursor-pointer"
    : "";
  return (
    <div
      className={`rounded-lg border border-line bg-surface shadow-soft transition-all ease-smooth ${PADDING[padding]} ${interactiveCls} ${className}`}
      {...rest}
    />
  );
}

export function CardHeader({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mb-4 ${className}`} {...rest} />;
}

export function CardTitle({ className = "", ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`font-serif text-lg text-ink ${className}`} {...rest} />;
}

export function CardDescription({ className = "", ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm text-ink-muted ${className}`} {...rest} />;
}
