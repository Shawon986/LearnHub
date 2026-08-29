"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { ActionButton } from "@/components/action-button";
import { deleteCourse, reviewCourse, setCourseStatus } from "@/lib/actions/admin-course";

export function CourseReviewActions({
  courseId,
  courseTitle,
  status,
}: {
  courseId: string;
  courseTitle: string;
  status: string;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="flex items-center justify-end gap-1.5">
      {status === "REVIEW" && (
        <>
          <ActionButton
            size="sm"
            action={reviewCourse.bind(null, courseId, { decision: "APPROVE" })}
            confirm={`Approve "${courseTitle}" for publishing?`}
            successMessage="Course published 🚀"
          >
            Approve
          </ActionButton>
          <Button size="sm" variant="outline" onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
        </>
      )}
      {status === "PUBLISHED" && (
        <ActionButton
          size="sm"
          variant="outline"
          action={setCourseStatus.bind(null, courseId, "UNPUBLISHED")}
          confirm={`Unpublish "${courseTitle}"? It will disappear from the marketplace.`}
        >
          Unpublish
        </ActionButton>
      )}
      {(status === "UNPUBLISHED" || status === "DRAFT") && (
        <ActionButton
          size="sm"
          variant="ghost"
          action={setCourseStatus.bind(null, courseId, "ARCHIVED")}
          confirm={`Archive "${courseTitle}"?`}
        >
          Archive
        </ActionButton>
      )}
      {status === "ARCHIVED" && (
        <span className="text-[11px] font-semibold text-faint-fg">Archived</span>
      )}

      {status !== "PUBLISHED" && (
        <ActionButton
          size="sm"
          variant="danger"
          action={deleteCourse.bind(null, courseId)}
          confirm={`Permanently delete "${courseTitle}"? Courses with enrollments or payments cannot be deleted.`}
          successMessage="Course deleted."
        >
          Delete
        </ActionButton>
      )}

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Send course back"
        description="The teacher can edit the course and resubmit it."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <ActionButton
              variant="danger"
              action={() =>
                reviewCourse(courseId, { decision: "REJECT", reason: reason || undefined })
              }
              successMessage="Course sent back to the teacher."
            >
              Send back
            </ActionButton>
          </>
        }
      >
        <Textarea
          label="Reason (shown to the teacher)"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Module 2 has no lessons yet — please complete the curriculum."
        />
      </Modal>
    </div>
  );
}
