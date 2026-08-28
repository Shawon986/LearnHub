"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/action-button";
import { refundPaymentAction } from "@/lib/actions/payment";

export function RefundButton({ paymentId }: { paymentId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <>
      <Button size="sm" variant="outline" className="text-danger hover:bg-danger-soft" onClick={() => setOpen(true)}>
        Refund
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Refund payment"
        description="This reverses the payment, the teacher's commission and the student's enrollment."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <ActionButton
              variant="danger"
              action={() => refundPaymentAction(paymentId, reason || undefined)}
              confirm="Issue this refund? This cannot be undone."
              successMessage="Refund issued — wallet and enrollment reversed."
            >
              Confirm refund
            </ActionButton>
          </>
        }
      >
        <Input
          label="Reason (optional, shown to the student)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Course content didn't match description"
        />
      </Modal>
    </>
  );
}
