"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { ActionButton } from "@/components/action-button";
import { useToast } from "@/components/ui/toast";
import { deleteUser, setUserRole, setUserStatus } from "@/lib/actions/admin";
import type { ActionResult } from "@/lib/actions/shared";

const ROLES = ["STUDENT", "TEACHER", "ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"];

export function UserRowActions({
  targetId,
  targetName,
  targetRole,
  targetStatus,
  actorRole,
}: {
  targetId: string;
  targetName: string;
  targetRole: string;
  targetStatus: string;
  actorRole: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const canDisciplineAdmin = actorRole === "SUPER_ADMIN";
  const isAdminTarget = ["ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"].includes(targetRole);
  const mayEditRoles = canDisciplineAdmin || !isAdminTarget;

  function run(action: () => Promise<ActionResult>, successTitle: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast({ title: successTitle, variant: "success" });
        router.refresh();
      } else {
        toast({ title: result.error ?? "Action failed.", variant: "error" });
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {targetStatus !== "ACTIVE" && (
        <ActionButton
          size="sm"
          variant="secondary"
          action={setUserStatus.bind(null, { userId: targetId, action: "ACTIVATE" })}
          confirm={`Activate ${targetName}?`}
        >
          Activate
        </ActionButton>
      )}
      {targetStatus === "ACTIVE" && (
        <ActionButton
          size="sm"
          variant="outline"
          action={setUserStatus.bind(null, { userId: targetId, action: "SUSPEND" })}
          confirm={`Suspend ${targetName}? They will be signed out of everything.`}
        >
          Suspend
        </ActionButton>
      )}

      <Dropdown
        align="end"
        trigger={
          <button
            type="button"
            aria-label={`More actions for ${targetName}`}
            disabled={pending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-card-2 hover:text-foreground disabled:opacity-50"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        }
      >
        {mayEditRoles && targetStatus !== "BANNED" && (
          <DropdownItem
            danger
            onClick={() => {
              if (window.confirm(`Ban ${targetName}? They will lose access immediately.`)) {
                run(
                  () => setUserStatus({ userId: targetId, action: "BAN" }),
                  `${targetName} has been banned.`,
                );
              }
            }}
          >
            Ban user
          </DropdownItem>
        )}
        <DropdownSeparator />
        {mayEditRoles &&
          ROLES.filter((r) => r !== targetRole).map((role) => (
            <DropdownItem
              key={role}
              onClick={() => {
                if (window.confirm(`Change ${targetName}'s role to ${role}?`)) {
                  run(
                    () => setUserRole({ userId: targetId, role }),
                    `${targetName} is now ${role}.`,
                  );
                }
              }}
            >
              Make {role}
            </DropdownItem>
          ))}
        {(!isAdminTarget || canDisciplineAdmin) && (
          <>
            <DropdownSeparator />
            <DropdownItem
              danger
              onClick={() => {
                if (
                  window.confirm(
                    `Permanently delete ${targetName}? This cannot be undone. Users with courses, bookings, payments or messages cannot be deleted.`,
                  )
                ) {
                  run(() => deleteUser(targetId), `${targetName} has been deleted.`);
                }
              }}
            >
              Delete user
            </DropdownItem>
          </>
        )}
      </Dropdown>
    </div>
  );
}
