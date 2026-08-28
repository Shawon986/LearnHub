import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, hint, error, className, id, ...rest }: TextareaProps) {
  const textareaId = id ?? (label ? `textarea-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  const field = (
    <textarea
      id={textareaId}
      aria-invalid={Boolean(error)}
      className={cn(
        "min-h-24 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-foreground shadow-soft",
        "placeholder:text-faint-fg",
        "transition-colors hover:border-line-strong",
        "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25",
        "disabled:cursor-not-allowed disabled:opacity-60",
        error && "border-danger focus:border-danger focus:ring-danger/25",
        className,
      )}
      {...rest}
    />
  );

  if (!label) return field;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={textareaId}>{label}</Label>
      {field}
      {(error || hint) && (
        <p className={cn("px-1 text-xs", error ? "text-danger" : "text-faint-fg")}>{error ?? hint}</p>
      )}
    </div>
  );
}
