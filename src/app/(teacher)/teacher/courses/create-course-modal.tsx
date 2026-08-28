"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createCourse } from "@/lib/actions/teacher";

export function CreateCourseModal({
  categories,
  trigger,
}: {
  categories: { id: string; name: string }[];
  trigger?: ReactNode;
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
      const result = await createCourse({
        title: String(form.get("title")),
        subtitle: String(form.get("subtitle") ?? ""),
        categoryId: String(form.get("categoryId")),
        type: String(form.get("type")),
        difficulty: String(form.get("difficulty")),
        price: Number(form.get("price")),
        language: String(form.get("language")),
      });
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "Could not create the course.");
      }
    });
  }

  return (
    <>
      <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>
        New course
      </Button>
      {trigger && <span onClick={() => setOpen(true)}>{trigger}</span>}

      <Modal open={open} onClose={() => setOpen(false)} title="Create a course" description="You'll build the curriculum in Phase 3's course builder.">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Course title" name="title" placeholder="e.g. Python for Absolute Beginners" required />
          <Input label="Subtitle" name="subtitle" placeholder="One line that sells the course" />
          <Select
            label="Category"
            name="categoryId"
            placeholder="Select a category…"
            required
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Course type"
              name="type"
              defaultValue="RECORDED"
              options={[
                { value: "RECORDED", label: "Recorded" },
                { value: "LIVE", label: "Live" },
                { value: "HYBRID", label: "Hybrid" },
                { value: "ONE_ON_ONE", label: "1-on-1" },
              ]}
            />
            <Select
              label="Difficulty"
              name="difficulty"
              defaultValue="ALL_LEVELS"
              options={["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"].map((v) => ({
                value: v,
                label: v.charAt(0) + v.slice(1).toLowerCase().replace("_", " "),
              }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (৳)" name="price" type="number" min={0} defaultValue={0} />
            <Input label="Language" name="language" defaultValue="English" />
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
              Create course
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
