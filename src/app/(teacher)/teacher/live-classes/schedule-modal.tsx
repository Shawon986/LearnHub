"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { scheduleLiveClass } from "@/lib/actions/teacher";

export function ScheduleLiveClassModal() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await scheduleLiveClass({
        title: String(form.get("title")),
        description: String(form.get("description") ?? ""),
        date: String(form.get("date")),
        startTime: String(form.get("startTime")),
        durationMinutes: Number(form.get("durationMinutes")),
        maxStudents: Number(form.get("maxStudents")),
        meetingUrl: String(form.get("meetingUrl")),
      });
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "Could not schedule the class.");
      }
    });
  }

  return (
    <>
      <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>
        Schedule class
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Schedule a live class"
        description="Students register for free and get the meeting link automatically."
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Title" name="title" placeholder="e.g. React Hooks Deep Dive" required />
          <Textarea label="Description" name="description" rows={3} placeholder="What will you cover? Any prerequisites?" />
          <Input
            label="Meeting link"
            name="meetingUrl"
            type="url"
            required
            placeholder="https://zoom.us/j/…"
            hint="Students join via this link — it stays visible only to registered students."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" name="date" type="date" required />
            <Input label="Start time" name="startTime" type="time" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duration (minutes)" name="durationMinutes" type="number" min={15} max={600} defaultValue={60} />
            <Input label="Max students" name="maxStudents" type="number" min={1} max={500} defaultValue={50} />
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
              Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
