import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-sage text-white hover:bg-sage-dark shadow-soft disabled:bg-sage/60",
  secondary:
    "bg-seablue text-white hover:bg-seablue-dark shadow-soft disabled:bg-seablue/60",
  ghost:
    "bg-transparent text-ink hover:bg-surface-muted border border-line",
  danger:
    "bg-danger text-white hover:brightness-95 shadow-soft disabled:opacity-60",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", fullWidth, className = "", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all ease-smooth disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    />
  );
});
