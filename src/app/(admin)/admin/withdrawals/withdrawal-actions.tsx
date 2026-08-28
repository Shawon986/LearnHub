"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/action-button";
import { approveWithdrawal, payWithdrawal, rejectWithdrawal } from "@/lib/actions/withdrawal-admin";

export function WithdrawalActions({ id, status }: { id: string; status: string }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {status === "PENDING" && (
        <>
          <ActionButton size="sm" action={approveWithdrawal.bind(null, id)} successMessage="Withdrawal approved.">
            Approve
          </ActionButton>
          <Button size="sm" variant="outline" className="text-danger hover:bg-danger-soft" onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
        </>
      )}
      {status === "APPROVED" && (
        <>
          <ActionButton
            size="sm"
            action={payWithdrawal.bind(null, id)}
            confirm="Mark this withdrawal as paid? This finalizes the payout."
            successMessage="Marked as paid."
          >
            Mark paid
          </ActionButton>
          <Button size="sm" variant="outline" className="text-danger hover:bg-danger-soft" onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
        </>
      )}

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject withdrawal"
        description="The funds return to the teacher's available balance."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <ActionButton
              variant="danger"
              action={() => rejectWithdrawal(id, reason)}
              confirm="Reject this withdrawal?"
              successMessage="Withdrawal rejected — funds returned."
            >
              Reject
            </ActionButton>
          </>
        }
      >
        <Input
          label="Reason (shown to the teacher)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Account details don't match your profile"
        />
      </Modal>
    </div>
  );
}
