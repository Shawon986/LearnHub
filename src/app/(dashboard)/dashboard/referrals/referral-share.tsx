"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copies the full invite link (registration with the code pre-filled). */
export function ReferralShare({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      size="sm"
      className="border border-white/25 bg-white/15 text-white hover:bg-white/25"
      leftIcon={copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
      onClick={() => {
        const url = `${window.location.origin}/register?ref=${encodeURIComponent(code)}`;
        navigator.clipboard?.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "Link copied!" : "Copy invite link"}
    </Button>
  );
}
