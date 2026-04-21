import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";

interface FieldProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
}

function Field({
  label,
  helperText,
  error,
  required,
  children,
}: FieldProps & { children: React.ReactNode }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : helperText ? (
        <span className="mt-1 block text-xs text-ink-subtle">{helperText}</span>
      ) : null}
    </label>
  );
}

const baseControl =
  "w-full rounded-md border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-subtle transition-all ease-smooth focus:outline-none focus:ring-2 focus:ring-offset-0";
const ok = "border-line focus:border-sage focus:ring-sage/25";
const bad = "border-danger focus:border-danger focus:ring-danger/25";

type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldProps;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, error, required, className = "", ...rest },
  ref,
) {
  return (
    <Field label={label} helperText={helperText} error={error} required={required}>
      <input
        ref={ref}
        required={required}
        className={`${baseControl} ${error ? bad : ok} ${className}`}
        {...rest}
      />
    </Field>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, helperText, error, required, className = "", ...rest },
  ref,
) {
  return (
    <Field label={label} helperText={helperText} error={error} required={required}>
      <textarea
        ref={ref}
        required={required}
        className={`${baseControl} resize-y ${error ? bad : ok} ${className}`}
        {...rest}
      />
    </Field>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & FieldProps;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helperText, error, required, className = "", children, ...rest },
  ref,
) {
  return (
    <Field label={label} helperText={helperText} error={error} required={required}>
      <select
        ref={ref}
        required={required}
        className={`${baseControl} ${error ? bad : ok} ${className}`}
        {...rest}
      >
        {children}
      </select>
    </Field>
  );
});
