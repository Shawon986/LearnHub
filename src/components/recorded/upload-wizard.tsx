"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, FileUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { createRecordedClass } from "@/lib/actions/recorded";

export interface SerializedCourse {
  id: string;
  title: string;
  modules: { id: string; title: string; lessons: { id: string; title: string }[] }[];
}

interface UploadedFile {
  id: string;
  title: string;
  kind: "video" | "thumbnail" | "resource";
  path: string;
  sizeBytes: number;
  resourceType?: string;
}

/** Shared upload wizard — used by both the admin and the teacher dashboards. */
export function UploadWizard({
  courses,
  listHref,
}: {
  courses: SerializedCourse[];
  /** Where to land after saving (role-specific recorded-classes list). */
  listHref: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [lessonId, setLessonId] = useState("");

  const videoFile = uploads.find((u) => u.kind === "video");
  const thumbnailFile = uploads.find((u) => u.kind === "thumbnail");
  const resourceFiles = uploads.filter((u) => u.kind === "resource");

  const fileInput = useRef<HTMLInputElement>(null);

  function uploadFile(file: File, kind: "video" | "thumbnail" | "resource") {
    setUploading(true);
    setProgress(0);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/videos/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        setUploads((prev) => [
          ...prev,
          { id: data.upload.id, title: file.name, kind, path: data.upload.path, sizeBytes: data.upload.sizeBytes },
        ]);
        toast({ title: `${kind} uploaded`, variant: "success" });
      } else {
        const data = (() => {
          try {
            return JSON.parse(xhr.responseText);
          } catch {
            return null;
          }
        })();
        setError(data?.message ?? "Upload failed.");
      }
    };
    xhr.onerror = () => {
      setUploading(false);
      setError("Upload failed — check your connection and try again.");
    };
    xhr.send(form);
  }

  function removeUpload(u: UploadedFile) {
    setUploads((prev) => prev.filter((x) => x.id !== u.id));
    // Clean the orphaned asset + its file server-side (best effort).
    fetch(`/api/videos/${u.id}`, { method: "DELETE" }).catch(() => {});
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!videoFile) {
      setError("Upload a video file first.");
      return;
    }
    const form = new FormData(e.currentTarget);
    setError(null);

    const resources = resourceFiles.map((r, i) => ({
      title: String(form.get(`resourceTitle-${i}`) ?? r.title),
      type: String(form.get(`resourceType-${i}`) ?? "PDF"),
      path: r.path,
    }));

    startTransition(async () => {
      const result = await createRecordedClass({
        title: String(form.get("title")),
        description: String(form.get("description") ?? ""),
        courseId: courseId || null,
        moduleId: moduleId || null,
        lessonId: lessonId || null,
        videoId: videoFile.id,
        thumbnailPath: thumbnailFile?.path ?? null,
        language: String(form.get("language") ?? "English"),
        tags: String(form.get("tags") ?? ""),
        durationSeconds: Number(form.get("durationSeconds") ?? 0),
        resources,
      });
      if (result.ok) {
        toast({ title: "Recording saved", description: "It will appear in your list.", variant: "success" });
        router.push(listHref);
        router.refresh();
      } else {
        setError(result.error ?? "Could not save the recording.");
      }
    });
  }

  const selectedCourse = courses.find((c) => c.id === courseId);
  const selectedModule = selectedCourse?.modules.find((m) => m.id === moduleId);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Uploads */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-display text-[15px] font-bold text-foreground">Files</h2>
            <p className="text-[12px] text-muted-fg">
              Video (required) · thumbnail and resources (optional). Max 500 MB.
            </p>
          </div>

          {uploading && (
            <div className="rounded-xl border border-line bg-card-2 p-4">
              <div className="flex items-center gap-2 text-[13px] font-bold text-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-brand-fg" /> Uploading… {progress}%
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {uploads.length > 0 && (
            <ul className="space-y-2">
              {uploads.map((u, i) => (
                <li key={u.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <Clapperboard className="h-4 w-4 shrink-0 text-brand-fg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-foreground">{u.title}</p>
                    <p className="text-[11px] text-faint-fg">
                      {(u.sizeBytes / 1024 / 1024).toFixed(1)} MB · {u.kind}
                    </p>
                  </div>
                  {u.kind === "resource" && (
                    <Select
                      className="w-28"
                      name={`resourceType-${i}`}
                      options={["PDF", "DOCX", "PPTX", "ZIP"].map((t) => ({ value: t, label: t }))}
                    />
                  )}
                  <Badge variant={u.kind === "video" ? "accent" : "neutral"}>{u.kind}</Badge>
                  <button
                    type="button"
                    aria-label={`Remove ${u.title}`}
                    onClick={() => removeUpload(u)}
                    className="rounded-lg p-1.5 text-faint-fg transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <input
            ref={fileInput}
            type="file"
            className="hidden"
            accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp,.pdf,.doc,.docx,.ppt,.pptx,.zip"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const kind: "video" | "thumbnail" | "resource" = file.type.startsWith("video/")
                ? "video"
                : file.type.startsWith("image/")
                  ? "thumbnail"
                  : "resource";
              uploadFile(file, kind);
              e.target.value = "";
            }}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              leftIcon={<FileUp className="h-4 w-4" />}
              onClick={() => fileInput.current?.click()}
            >
              Upload video
            </Button>
            <Button
              type="button"
              variant="outline"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => fileInput.current?.click()}
            >
              Add thumbnail / resource
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-display text-[15px] font-bold text-foreground">Metadata</h2>
            <p className="text-[12px] text-muted-fg">Title, description and optional course attachment.</p>
          </div>
          <Input label="Title" name="title" placeholder="e.g. Full Recording: React Hooks Deep Dive" required />
          <Textarea label="Description" name="description" rows={3} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Duration (seconds, optional)" name="durationSeconds" type="number" min={0} defaultValue={0} />
            <Input label="Language" name="language" defaultValue="English" />
          </div>
          <Input label="Tags (comma separated)" name="tags" placeholder="react, hooks, live" />

          {/* Course picker */}
          <div className="rounded-xl border border-line bg-card-2/50 p-4">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-faint-fg">
              Link to a course (optional — protected by enrollment)
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Course"
                placeholder="Standalone"
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setModuleId("");
                  setLessonId("");
                }}
                options={courses.map((c) => ({ value: c.id, label: c.title }))}
              />
              {selectedCourse && (
                <Select
                  label="Module"
                  placeholder="Any module"
                  value={moduleId}
                  onChange={(e) => {
                    setModuleId(e.target.value);
                    setLessonId("");
                  }}
                  options={selectedCourse.modules.map((m) => ({ value: m.id, label: m.title }))}
                />
              )}
              {selectedModule && (
                <Select
                  label="Lesson"
                  placeholder="Any lesson"
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  options={selectedModule.lessons.map((l) => ({ value: l.id, label: l.title }))}
                />
              )}
            </div>
            {courseId && (
              <p className="mt-2 text-[11px] font-semibold text-faint-fg">
                Course-linked recordings require enrollment to watch.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="lg"
          loading={pending}
          disabled={!videoFile || uploading}
          className={cn(!videoFile && "opacity-60")}
        >
          Save recording
        </Button>
      </div>
    </form>
  );
}
