"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createAnnouncement } from "@/lib/actions/admin";

export function AnnouncementForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createAnnouncement({
        title: String(form.get("title")),
        body: String(form.get("body")),
        audience: String(form.get("audience")) as "ALL" | "STUDENTS" | "TEACHERS",
      });
      if (result.ok) {
        toast({ title: "Announcement sent 📣", description: "Delivered as an in-app notification to the audience.", variant: "success" });
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } else {
        setError(result.error ?? "Could not send the announcement.");
      }
    });
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-brand-fg" /> New announcement
        </CardTitle>
        <CardDescription>Sends an in-app notification to everyone in the audience.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Title" name="title" placeholder="e.g. Eid sale starts Friday!" required />
          <Textarea label="Message" name="body" rows={4} placeholder="What do learners and teachers need to know?" required />
          <Select
            label="Audience"
            name="audience"
            defaultValue="ALL"
            options={[
              { value: "ALL", label: "Everyone" },
              { value: "STUDENTS", label: "Students only" },
              { value: "TEACHERS", label: "Teachers only" },
            ]}
          />
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" loading={pending}>
            Send announcement
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
