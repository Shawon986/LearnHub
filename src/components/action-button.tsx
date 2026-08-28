"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

interface ActionButtonProps extends ButtonProps {
  /** Server action to invoke. Pass bound actions like `registerLiveClass.bind(null, id)`. */
  action: () => Promise<ActionResult>;
  /** When set, ask for confirmation before running the action. */
  confirm?: string;
  successMessage?: string;
}

export function ActionButton({
  action,
  confirm: confirmMessage,
  successMessage,
  onClick,
  children,
  ...rest
}: ActionButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    onClick?.(e);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        if (successMessage) toast({ title: successMessage, variant: "success" });
        router.refresh();
      } else {
        toast({ title: result.error ?? "Something went wrong.", variant: "error" });
      }
    });
  }

  return (
    <Button {...rest} loading={pending} onClick={handleClick}>
      {children}
    </Button>
  );
}
