"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { upsertCategory } from "@/lib/actions/admin";

const ICON_OPTIONS = [
  { value: "Code2", label: "Code" },
  { value: "Terminal", label: "Terminal" },
  { value: "BrainCircuit", label: "AI / Brain" },
  { value: "Palette", label: "Design" },
  { value: "Briefcase", label: "Business" },
  { value: "Megaphone", label: "Marketing" },
  { value: "Languages", label: "Languages" },
  { value: "BookOpen", label: "Book" },
  { value: "Target", label: "Target" },
  { value: "Music", label: "Music" },
];

interface Initial {
  id?: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isFeatured: boolean;
  sortOrder: number;
}

export function CategoryFormModal({
  initial,
  triggerLabel,
}: {
  initial?: Initial;
  triggerLabel?: string;
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
      const result = await upsertCategory({
        id: initial?.id,
        name: String(form.get("name")),
        description: String(form.get("description") ?? ""),
        icon: String(form.get("icon") ?? ""),
        color: String(form.get("color") ?? ""),
        isFeatured: form.get("isFeatured") === "on",
        sortOrder: Number(form.get("sortOrder") ?? 0),
      });
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "Could not save the category.");
      }
    });
  }

  return (
    <>
      {initial ? (
        <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>
          {triggerLabel ?? "Edit"}
        </Button>
      ) : (
        <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>
          New category
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={initial ? "Edit category" : "Create category"}
        description="Categories organize the marketplace and power search filters."
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Name" name="name" defaultValue={initial?.name ?? ""} placeholder="e.g. Web Development" required />
          <Input label="Description" name="description" defaultValue={initial?.description ?? ""} />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Icon"
              name="icon"
              defaultValue={initial?.icon ?? ""}
              placeholder="Pick an icon…"
              options={ICON_OPTIONS}
            />
            <Input
              label="Color"
              name="color"
              defaultValue={initial?.color ?? "#6d28d9"}
              placeholder="#6d28d9"
              hint="Hex color for the category accent."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Sort order" name="sortOrder" type="number" min={0} defaultValue={initial?.sortOrder ?? 0} />
            <label className="inline-flex cursor-pointer items-center gap-2 self-end pb-2 text-[13px] font-semibold text-muted-fg">
              <input
                type="checkbox"
                name="isFeatured"
                defaultChecked={initial?.isFeatured ?? false}
                className="h-4 w-4 rounded border-line accent-[var(--brand)]"
              />
              Featured on homepage
            </label>
          </div>
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
              {initial ? "Save changes" : "Create category"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
