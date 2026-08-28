"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { ActionButton } from "@/components/action-button";
import { reviewVerification } from "@/lib/actions/admin";

export function VerificationActions({
  teacherId,
  teacherName,
}: {
  teacherId: string;
  teacherName: string;
}) {
  const [modal, setModal] = useState<null | "REJECTED" | "CHANGES_REQUESTED">(null);
  const [reason, setReason] = useState("");

  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton
        size="sm"
        action={reviewVerification.bind(null, { teacherId, decision: "APPROVED" })}
        confirm={`Approve ${teacherName}? They will get the verified badge.`}
        successMessage={`${teacherName} is now verified 🎉`}
      >
        Approve
      </ActionButton>
      <Button size="sm" variant="outline" onClick={() => setModal("CHANGES_REQUESTED")}>
        Request changes
      </Button>
      <Button size="sm" variant="outline" className="text-danger hover:bg-danger-soft" onClick={() => setModal("REJECTED")}>
        Reject
      </Button>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "REJECTED" ? "Reject application" : "Request changes"}
        description={
          modal === "REJECTED"
            ? "The teacher will be notified with your reason."
            : "Tell the teacher what to fix — they can resubmit."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <ActionButton
              variant={modal === "REJECTED" ? "danger" : "primary"}
              action={() =>
                reviewVerification({
                  teacherId,
                  decision: modal as "REJECTED" | "CHANGES_REQUESTED",
                  reason: reason || undefined,
                })
              }
              successMessage="Decision sent to the teacher."
            >
              {modal === "REJECTED" ? "Reject" : "Send request"}
            </ActionButton>
          </>
        }
      >
        <Textarea
          label="Reason (shown to the teacher)"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Please upload a clearer copy of your national ID."
        />
      </Modal>
    </div>
  );
}
