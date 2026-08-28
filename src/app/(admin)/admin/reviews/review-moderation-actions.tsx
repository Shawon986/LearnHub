"use client";

import { ActionButton } from "@/components/action-button";
import { moderateReview } from "@/lib/actions/admin-review";

export function ReviewModerationActions({ reviewId, status }: { reviewId: string; status: string }) {
  if (status === "REMOVED") {
    return (
      <ActionButton
        size="sm"
        variant="secondary"
        action={moderateReview.bind(null, reviewId, "RESTORE")}
        successMessage="Review restored."
      >
        Restore
      </ActionButton>
    );
  }
  return (
    <ActionButton
      size="sm"
      variant="outline"
      className="text-danger hover:bg-danger-soft"
      action={moderateReview.bind(null, reviewId, "REMOVE")}
      confirm="Remove this review? It will be hidden from the platform."
      successMessage="Review removed."
    >
      Remove
    </ActionButton>
  );
}
