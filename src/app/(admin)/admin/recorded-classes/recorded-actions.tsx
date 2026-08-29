"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ActionButton } from "@/components/action-button";
import {
  archiveRecordedClass,
  deleteRecordedClass,
  publishRecordedClass,
  restoreRecordedClass,
  unpublishRecordedClass,
  updateRecordedClass,
} from "@/lib/actions/recorded";

export function RecordedActions({
  id,
  status,
  videoStatus,
  courses,
  initial,
}: {
  id: string;
  status: string;
  videoStatus: string;
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
      {/* Preview (admin bypass — any status) */}
      <Link
        href={`/admin/recorded-classes/${id}/preview`}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-muted-fg transition-colors hover:bg-card-2 hover:text-foreground"
      >
        <Eye className="h-3.5 w-3.5" /> Preview
      </Link>

      {/* Edit metadata */}
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-muted-fg transition-colors hover:bg-card-2 hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit
      </button>

      {["DRAFT", "READY"].includes(status) && videoStatus === "READY" && (
        <ActionButton
          size="sm"
          action={publishRecordedClass.bind(null, id)}
          successMessage="Recording published 🎬"
        >
          Publish
        </ActionButton>
      )}
      {status === "PUBLISHED" && (
        <ActionButton
          size="sm"
          variant="outline"
          action={unpublishRecordedClass.bind(null, id)}
          confirm="Unpublish this recording? It will disappear from the library."
        >
          Unpublish
        </ActionButton>
      )}
      {status === "ARCHIVED" && (
        <ActionButton
          size="sm"
          variant="secondary"
          action={restoreRecordedClass.bind(null, id)}
          successMessage="Recording restored — publish it to go live again."
        >
          <RotateCcw className="h-3.5 w-3.5" /> Restore
        </ActionButton>
      )}
      {status !== "ARCHIVED" && status !== "PUBLISHED" && (
        <ActionButton
          size="sm"
          variant="ghost"
          action={archiveRecordedClass.bind(null, id)}
          confirm="Archive this recording?"
        >
          Archive
        </ActionButton>
      )}
      <ActionButton
        size="sm"
        variant="danger"
        action={deleteRecordedClass.bind(null, id)}
        confirm={
          status === "PUBLISHED"
            ? "This recording is LIVE. Permanently delete it along with its video file? This cannot be undone."
            : "Permanently delete this recording and its video file? This cannot be undone."
        }
        successMessage="Recording deleted (video file removed)."
      >
        Delete
      </ActionButton>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit recording" size="md">
        <form onSubmit={onEdit} className="space-y-4">
          <Input label="Title" name="title" defaultValue={initial.title} required />
          <Textarea label="Description" name="description" rows={3} defaultValue={initial.description} />
          <div className="grid gap-4 sm:grid-cols-2">
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
