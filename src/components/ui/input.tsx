import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  containerClassName?: string;
}

export function Input({
  label,
  hint,
  error,
  leftIcon,
  rightSlot,
  containerClassName,
  className,
  id,
  ...rest
}: InputProps) {
  const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  const field = (
    <div className={cn("relative", containerClassName)}>
      {leftIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint-fg [&>svg]:h-4 [&>svg]:w-4">
          {leftIcon}
        </span>
      )}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(
          "h-10 w-full rounded-xl border border-line bg-card px-3.5 text-sm text-foreground shadow-soft",
          "placeholder:text-faint-fg",
          "transition-colors hover:border-line-strong",
          "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25",
          "disabled:cursor-not-allowed disabled:opacity-60",
          leftIcon && "pl-9.5",
          rightSlot && "pr-11",
          error && "border-danger focus:border-danger focus:ring-danger/25",
          className,
        )}
        {...rest}
      />
      {rightSlot && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>
      )}
    </div>
  );

  if (!label) {
    return error || hint ? (
      <div className="space-y-1.5">
        {field}
        {(error || hint) && (
          <p
            id={error ? `${inputId}-error` : `${inputId}-hint`}
            className={cn("px-1 text-xs", error ? "text-danger" : "text-faint-fg")}
          >
            {error ?? hint}
          </p>
        )}
      </div>
    ) : (
      field
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      {field}
      {(error || hint) && (
        <p
          id={error ? `${inputId}-error` : `${inputId}-hint`}
          className={cn("px-1 text-xs", error ? "text-danger" : "text-faint-fg")}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
