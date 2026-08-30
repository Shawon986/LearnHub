"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Modal } from "@/components/ui/modal";

/**
 * One-click preview: renders the public teacher profile inside a modal
 * (no separate page / tab needed) so the teacher sees exactly what
 * students see.
 */
export function ProfilePreview({ teacherId }: { teacherId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-xs font-semibold text-foreground transition-colors hover:bg-card-2"
      >
        <Eye className="h-3.5 w-3.5" /> Preview
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Your public profile"
        description="Exactly how students see you."
        size="lg"
      >
        <iframe
          src={`/teachers/${teacherId}?preview=1`}
          title="Public profile preview"
          className="h-[62dvh] w-full rounded-xl border border-line bg-background sm:h-[70vh]"
        />
      </Modal>
    </>
  );
}
