"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface DropdownContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

export function Dropdown({
  trigger,
  children,
  align = "end",
  className,
  panelClassName,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
  /** Extra classes for the floating panel (e.g. mobile positioning). */
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={rootRef} className={cn("relative", className)}>
        <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
        <AnimatePresence>
          {open && (
            <motion.div
              className={cn(
                "absolute z-40 mt-2 min-w-44 overflow-hidden rounded-xl border border-line bg-card py-1.5 shadow-lift",
                align === "end" ? "right-0" : "left-0",
                panelClassName,
              )}
              initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -4, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              role="menu"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DropdownContext.Provider>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function DropdownItem({ children, onClick, href, danger, icon, className }: DropdownItemProps) {
  const ctx = useContext(DropdownContext);
  const classes = cn(
    "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium transition-colors",
    danger ? "text-danger hover:bg-danger-soft" : "text-foreground hover:bg-card-2",
    className,
  );

  const handleClick = () => {
    ctx?.setOpen(false);
    onClick?.();
  };

  if (href) {
    return (
      <a href={href} className={classes} role="menuitem" onClick={() => ctx?.setOpen(false)}>
        {icon && <span className="text-muted-fg [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={classes} role="menuitem" onClick={handleClick}>
      {icon && <span className="text-muted-fg [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1.5 h-px bg-line" role="separator" />;
}
