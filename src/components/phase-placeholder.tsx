import { Construction } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Honest in-progress page for sections delivered in later phases.
 * Each one is replaced by its real implementation as phases land —
 * see /docs/PROGRESS.md.
 */
export function PhasePlaceholder({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon={<Construction />}
      title={`${title} — coming in ${phase}`}
      description={
        description ??
        "This section is being built phase by phase. The architecture, data model and navigation are already in place."
      }
    />
  );
}
