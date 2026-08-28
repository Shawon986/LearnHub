"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateCourse } from "@/lib/actions/course";

interface Initial {
  title: string;
  subtitle: string;
  description: string;
  categoryId: string;
  type: string;
  difficulty: string;
  price: number;
  compareAtPrice: number;
  language: string;
  requirements: string;
  outcomes: string;
  tags: string;
}

export function OverviewForm({
  courseId,
  editable,
  categories,
  initial,
}: {
  courseId: string;
  editable: boolean;
  categories: { id: string; name: string }[];
  initial: Initial;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await updateCourse(courseId, {
        title: String(form.get("title")),
        subtitle: String(form.get("subtitle") ?? ""),
        description: String(form.get("description") ?? ""),
        categoryId: String(form.get("categoryId")),
        type: String(form.get("type")),
        difficulty: String(form.get("difficulty")),
        price: Number(form.get("price")),
        compareAtPrice: form.get("compareAtPrice") ? Number(form.get("compareAtPrice")) : null,
        language: String(form.get("language")),
        requirements: String(form.get("requirements") ?? ""),
        outcomes: String(form.get("outcomes") ?? ""),
        tags: String(form.get("tags") ?? ""),
      });
      if (result.ok) {
        toast({ title: "Course updated", variant: "success" });
        router.refresh();
      } else {
        setError(result.error ?? "Could not save.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-fg" /> Course details
        </CardTitle>
        <CardDescription>
          {editable ? "Everything students see on the course page." : "Locked while under review / published."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <fieldset disabled={!editable} className="space-y-4 disabled:opacity-60">
            <Input label="Title" name="title" defaultValue={initial.title} required />
            <Input label="Subtitle" name="subtitle" defaultValue={initial.subtitle} />
            <Textarea label="Description" name="description" rows={4} defaultValue={initial.description} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                name="categoryId"
                defaultValue={initial.categoryId}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
              <Select
                label="Type"
                name="type"
                defaultValue={initial.type}
                options={[
                  { value: "RECORDED", label: "Recorded" },
                  { value: "LIVE", label: "Live" },
                  { value: "HYBRID", label: "Hybrid" },
                  { value: "ONE_ON_ONE", label: "1-on-1" },
                ]}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Difficulty"
                name="difficulty"
                defaultValue={initial.difficulty}
                options={["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"].map((v) => ({
                  value: v,
                  label: v.charAt(0) + v.slice(1).toLowerCase().replace("_", " "),
                }))}
              />
              <Input label="Language" name="language" defaultValue={initial.language} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Price (৳)" name="price" type="number" min={0} defaultValue={initial.price} />
              <Input
                label="Compare-at price (৳, optional)"
                name="compareAtPrice"
                type="number"
                min={0}
                defaultValue={initial.compareAtPrice || ""}
                hint="Shown struck-through for discounts."
              />
            </div>
            <Textarea
              label="Learning outcomes (one per line)"
              name="outcomes"
              rows={4}
              defaultValue={initial.outcomes}
            />
            <Textarea
              label="Requirements (one per line)"
              name="requirements"
              rows={3}
              defaultValue={initial.requirements}
            />
            <Input label="Tags (comma separated)" name="tags" defaultValue={initial.tags} />
          </fieldset>

          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
              {error}
            </p>
          )}
          {editable && (
            <div className="flex justify-end">
              <Button type="submit" loading={pending}>
                Save details
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
