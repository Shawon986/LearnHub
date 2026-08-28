"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { upsertCoupon } from "@/lib/actions/coupon";

interface CouponInitial {
  id?: string;
  code: string;
  type: string;
  value: number;
  minPurchase: number;
  maxUses: number | null;
  perUserLimit: number;
  expiresAt: string;
  courseId: string | null;
  status: string;
}

export function CouponFormModal({
  initial,
  courses,
  teacherMode,
}: {
  initial?: CouponInitial;
  courses: { id: string; title: string }[];
  teacherMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await upsertCoupon({
        id: initial?.id,
        code: String(form.get("code")),
        type: String(form.get("type")),
        value: Number(form.get("value")),
        minPurchase: Number(form.get("minPurchase") ?? 0),
        maxUses: form.get("maxUses") ? Number(form.get("maxUses")) : null,
        perUserLimit: Number(form.get("perUserLimit") ?? 1),
        expiresAt: String(form.get("expiresAt") ?? "") || null,
        courseId: form.get("courseId") ? String(form.get("courseId")) : null,
        status: String(form.get("status") ?? "ACTIVE"),
      });
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else setError(result.error ?? "Could not save the coupon.");
    });
  }

  return (
    <>
      {initial ? (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          Edit
        </Button>
      ) : (
        <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>
          New coupon
        </Button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={initial ? "Edit coupon" : "Create coupon"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Code"
            name="code"
            defaultValue={initial?.code ?? ""}
            placeholder="e.g. SUMMER20"
            hint="Letters, numbers and dashes."
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              name="type"
              defaultValue={initial?.type ?? "PERCENTAGE"}
              options={[
                { value: "PERCENTAGE", label: "Percentage (%)" },
                { value: "FIXED", label: "Fixed (৳)" },
              ]}
            />
            <Input
              label={initial?.type === "FIXED" ? "Value (৳)" : "Value (%)"}
              name="value"
              type="number"
              min={1}
              max={90}
              defaultValue={initial?.value ?? 10}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Minimum purchase (৳)" name="minPurchase" type="number" min={0} defaultValue={initial?.minPurchase ?? 0} />
            <Input label="Max uses (empty = unlimited)" name="maxUses" type="number" min={1} defaultValue={initial?.maxUses ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Per-user limit" name="perUserLimit" type="number" min={1} max={10} defaultValue={initial?.perUserLimit ?? 1} />
            <Input label="Expires (optional)" name="expiresAt" type="date" defaultValue={initial?.expiresAt ?? ""} />
          </div>
          <Select
            label="Course"
            name="courseId"
            placeholder={teacherMode ? "Pick your course…" : "All courses (global)"}
            defaultValue={initial?.courseId ?? ""}
            options={courses.map((c) => ({ value: c.id, label: c.title }))}
          />
          {initial && (
            <Select
              label="Status"
              name="status"
              defaultValue={initial.status}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
            />
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending} leftIcon={<Tags className="h-4 w-4" />}>
              {initial ? "Save changes" : "Create coupon"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
