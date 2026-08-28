"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Flag, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { RatingInput } from "@/components/ui/rating";
import { useToast } from "@/components/ui/toast";
import { deleteReview, reportReview, writeCourseReview, writeTeacherReview } from "@/lib/actions/review";

interface ReviewFormProps {
  targetType: "COURSE" | "TEACHER";
  targetId: string;
  targetName: string;
  /** Existing review by the current user (edit mode). */
  existing?: { id: string; rating: number; content: string } | null;
  canReview: boolean;
  ineligibleReason?: string;
}

export function ReviewForm({
  targetType,
  targetId,
  targetName,
  existing,
  canReview,
  ineligibleReason,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [content, setContent] = useState(existing?.content ?? "");
  const [pending, startTransition] = useTransition();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const write = targetType === "COURSE" ? writeCourseReview : writeTeacherReview;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await write(targetId, { rating, content });
      if (result.ok) {
        toast({
          title: existing ? "Review updated" : "Review published ⭐",
          description: "Thank you for helping other learners!",
          variant: "success",
        });
        router.refresh();
      } else {
        toast({ title: result.error ?? "Could not save review.", variant: "error" });
      }
    });
  }

  function submitReport() {
    startTransition(async () => {
      const result = await reportReview(existing!.id, { reason: reportReason });
      if (result.ok) {
        toast({ title: "Report submitted", description: "Our moderation team will review it.", variant: "success" });
        setReportOpen(false);
        setReportReason("");
        router.refresh();
      } else {
        toast({ title: result.error ?? "Could not report.", variant: "error" });
      }
    });
  }

  if (!canReview && !existing) {
    return (
      <Card className="p-5 text-[13px] text-muted-fg">
        {ineligibleReason ??
          "You can review after enrolling or completing a session."}
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-[14px] font-bold text-foreground">
          {existing ? "Your review" : `Review ${targetName}`}
        </p>
        {existing && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-faint-fg transition-colors hover:bg-card-2 hover:text-foreground"
            >
              <Flag className="h-3 w-3" /> Report
            </button>
            <button
              type="button"
              aria-label="Delete my review"
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteReview(existing.id);
                  if (result.ok) {
                    toast({ title: "Review deleted", variant: "success" });
                    router.refresh();
                  }
                })
              }
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-faint-fg transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex items-center gap-3">
          <RatingInput value={rating} onChange={setRating} size={24} />
          <span className="text-[12px] font-semibold text-muted-fg">
            {rating > 0 ? `${rating}/5` : "Tap to rate"}
          </span>
        </div>
        <Textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What did you like? What could be better?"
          hint="Minimum 10 characters."
        />
        <div className="flex justify-end gap-2">
          {existing && (
            <Button type="button" variant="ghost" onClick={() => router.refresh()}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={pending} disabled={rating === 0 || content.trim().length < 10}>
            {existing ? "Update review" : "Publish review"}
          </Button>
        </div>
      </form>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report this review">
        <div className="space-y-4">
          <Input
            label="Reason"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="e.g. Spam or inappropriate content"
            hint="Minimum 5 characters. Reports go to our moderation team."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={pending} disabled={reportReason.trim().length < 5} onClick={submitReport}>
              Submit report
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
