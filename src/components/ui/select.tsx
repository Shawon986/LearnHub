import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  hint,
  error,
  options,
  placeholder,
  className,
  id,
  ...rest
}: SelectProps) {
  const selectId = id ?? (label ? `select-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  const field = (
    <div className="relative">
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-10 w-full appearance-none rounded-xl border border-line bg-card pl-3.5 pr-9 text-sm text-foreground shadow-soft",
          "transition-colors hover:border-line-strong",
          "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25",
          "disabled:cursor-not-allowed disabled:opacity-60",
          error && "border-danger focus:border-danger focus:ring-danger/25",
          className,
        )}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint-fg"
        aria-hidden
      />
    </div>
  );

  if (!label) return field;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={selectId}>{label}</Label>
      {field}
      {(error || hint) && (
        <p className={cn("px-1 text-xs", error ? "text-danger" : "text-faint-fg")}>{error ?? hint}</p>
      )}
    </div>
  );
}
