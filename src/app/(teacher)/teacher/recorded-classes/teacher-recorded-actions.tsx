"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ActionButton } from "@/components/action-button";
import { deleteRecordedClass, updateRecordedClass } from "@/lib/actions/recorded";

export function TeacherRecordedActions({
  id,
  status,
  courses,
  initial,
}: {
  id: string;
  status: string;
  courses: { id: string; title: string }[];
  initial: {
    title: string;
    description: string;
    language: string;
    tags: string;
    durationSeconds: number;
    courseId: string | null;
  };
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await updateRecordedClass(id, {
        title: String(form.get("title")),
        description: String(form.get("description") ?? ""),
        courseId: form.get("courseId") ? String(form.get("courseId")) : null,
        language: String(form.get("language") ?? "English"),
        tags: String(form.get("tags") ?? ""),
        durationSeconds: Number(form.get("durationSeconds") ?? 0),
      });
      if (result.ok) {
        setEditOpen(false);
        router.refresh();
      } else setError(result.error ?? "Could not save.");
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-muted-fg transition-colors hover:bg-card-2 hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit
      </button>
      {status !== "PUBLISHED" && (
        <ActionButton
          size="sm"
          variant="danger"
          action={deleteRecordedClass.bind(null, id)}
          confirm="Permanently delete this recording and its video file? This cannot be undone."
          successMessage="Recording deleted."
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </ActionButton>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit recording" size="md">
        <form onSubmit={onEdit} className="space-y-4">
          <Input label="Title" name="title" defaultValue={initial.title} required />
          <Textarea label="Description" name="description" rows={3} defaultValue={initial.description} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duration (seconds)" name="durationSeconds" type="number" min={0} defaultValue={initial.durationSeconds} />
            <Input label="Language" name="language" defaultValue={initial.language} />
          </div>
          <Input label="Tags (comma separated)" name="tags" defaultValue={initial.tags} />
          <Select
            label="Linked course (optional)"
            name="courseId"
            placeholder="Standalone"
            defaultValue={initial.courseId ?? ""}
            options={courses.map((c) => ({ value: c.id, label: c.title }))}
          />
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Save changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
