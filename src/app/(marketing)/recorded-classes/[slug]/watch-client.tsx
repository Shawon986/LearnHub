"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { VideoPlayer } from "@/components/video/player";
import { useToast } from "@/components/ui/toast";
import {
  addBookmark,
  addNote,
  deleteBookmark,
  deleteNote,
  saveVideoProgress,
} from "@/lib/actions/video";

export function WatchClient({
  recordedClassId,
  playbackUrl,
  initialPosition,
  bookmarks,
  notes,
}: {
  recordedClassId: string;
  playbackUrl: string;
  initialPosition: number;
  bookmarks: { id: string; timeSeconds: number; label: string | null }[];
  notes: { id: string; timeSeconds: number; content: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    startTransition(async () => {
      const r = await action();
      if (r.ok) {
        if (success) toast({ title: success, variant: "success" });
        router.refresh();
      } else {
        toast({ title: r.error ?? "Something went wrong.", variant: "error" });
      }
    });
  }

  return (
    <VideoPlayer
      src={playbackUrl}
      initialPosition={initialPosition}
      bookmarks={bookmarks}
      notes={notes}
      onProgress={(pos, dur) => {
        void saveVideoProgress(recordedClassId, { positionSeconds: Math.floor(pos), durationSeconds: Math.floor(dur) });
      }}
      onComplete={() => {
        run(
          () => saveVideoProgress(recordedClassId, { positionSeconds: 100000, durationSeconds: 100000 }),
          "Recording completed 🎉",
        );
      }}
      onAddBookmark={(timeSeconds, label) =>
        run(() => addBookmark(recordedClassId, { timeSeconds, label }), "Bookmark saved")
      }
      onDeleteBookmark={(id) => run(() => deleteBookmark(id))}
      onAddNote={(timeSeconds, content) =>
        run(() => addNote(recordedClassId, { timeSeconds, content }), "Note saved")
      }
      onDeleteNote={(id) => run(() => deleteNote(id))}
    />
  );
}
