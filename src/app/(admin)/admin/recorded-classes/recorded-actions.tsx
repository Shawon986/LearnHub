"use client";

import { ActionButton } from "@/components/action-button";
import {
  archiveRecordedClass,
  deleteRecordedClass,
  publishRecordedClass,
  unpublishRecordedClass,
} from "@/lib/actions/recorded";

export function RecordedActions({
  id,
  status,
  videoStatus,
}: {
  id: string;
  status: string;
  videoStatus: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
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
      {status !== "ARCHIVED" && (
        <ActionButton
          size="sm"
          variant="ghost"
          action={archiveRecordedClass.bind(null, id)}
          confirm="Archive this recording?"
        >
          Archive
        </ActionButton>
      )}
      {["DRAFT", "FAILED"].includes(status) && (
        <ActionButton
          size="sm"
          variant="ghost"
          className="text-danger hover:bg-danger-soft"
          action={deleteRecordedClass.bind(null, id)}
          confirm="Delete this draft? You can re-upload the video."
        >
          Delete
        </ActionButton>
      )}
    </div>
  );
}
