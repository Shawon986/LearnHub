"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { openDispute } from "@/lib/actions/dispute";
import { formatBDT } from "@/lib/format";

interface PaymentOption {
  id: string;
  amount: number;
  label: string;
}
interface BookingOption {
  id: string;
  teacherName: string;
}

export function OpenDisputeModal({
  payments,
  bookings,
}: {
  payments: PaymentOption[];
  bookings: BookingOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const target = String(form.get("target") ?? "");
    const [kind, id] = target.split(":");
    setError(null);
    startTransition(async () => {
      const result = await openDispute({
        paymentId: kind === "payment" ? id : null,
        bookingId: kind === "booking" ? id : null,
        reason: String(form.get("reason")),
        description: String(form.get("description")),
      });
      if (result.ok) {
        toast({ title: "Dispute opened ⚖️", description: "Our team will review it shortly.", variant: "success" });
        setOpen(false);
        router.refresh();
      } else setError(result.error ?? "Could not open the dispute.");
    });
  }

  const hasTargets = payments.length > 0 || bookings.length > 0;

  return (
    <>
      <Button size="sm" variant="secondary" leftIcon={<Scale className="h-4 w-4" />} onClick={() => setOpen(true)} disabled={!hasTargets}>
        Open a dispute
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Open a dispute" description="Tell us what went wrong — we review every case.">
        <form onSubmit={onSubmit} className="space-y-4">
          <Select
            label="What is this about?"
            name="target"
            placeholder="Pick a payment or booking…"
            required
            options={[
              ...payments.map((p) => ({ value: `payment:${p.id}`, label: `${p.label} — ${formatBDT(p.amount)}` })),
              ...bookings.map((b) => ({ value: `booking:${b.id}`, label: `Session with ${b.teacherName}` })),
            ]}
          />
          <Select
            label="Reason"
            name="reason"
            defaultValue="PAYMENT_ISSUE"
            options={[
              { value: "PAYMENT_ISSUE", label: "Payment issue" },
              { value: "COURSE_ISSUE", label: "Course issue" },
              { value: "BOOKING_ISSUE", label: "Booking issue" },
              { value: "OTHER", label: "Other" },
            ]}
          />
          <Textarea
            label="Description"
            name="description"
            rows={4}
            placeholder="Describe the problem, what you expected, and what you'd like as an outcome."
            hint="Minimum 10 characters."
          />
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Submit dispute
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
