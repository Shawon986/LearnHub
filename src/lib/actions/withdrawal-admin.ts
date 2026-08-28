"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

/** Approve a pending withdrawal (reviewed — payment step follows). */
export async function approveWithdrawal(id: string): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const w = await db.withdrawal.findUnique({ where: { id } });
    if (!w) return actionError("Withdrawal not found.");
    if (w.status !== "PENDING") return actionError("Only pending withdrawals can be approved.");

    await db.withdrawal.update({
      where: { id },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: actor.id },
    });
    await createNotification({
      userId: w.teacherId,
      type: "WITHDRAWAL_APPROVED",
      title: "Withdrawal approved ✅",
      body: `Your ${w.method} withdrawal of ৳${w.amount.toLocaleString()} was approved and is being processed.`,
    });
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "withdrawal.approve",
      entityType: "Withdrawal",
      entityId: id,
    });
    revalidatePath("/admin/withdrawals");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Mark an approved withdrawal as paid out. */
export async function payWithdrawal(id: string): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const w = await db.withdrawal.findUnique({ where: { id } });
    if (!w) return actionError("Withdrawal not found.");
    if (w.status !== "APPROVED") return actionError("Approve the withdrawal first.");

    const wallet = await db.teacherWallet.findUnique({ where: { teacherId: w.teacherId } });
    if (!wallet) return actionError("Teacher wallet not found.");

    await db.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id },
        data: { status: "PAID", paidAt: new Date(), reviewedById: actor.id },
      });
      await tx.teacherWallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: { decrement: w.amount },
          totalWithdrawn: { increment: w.amount },
        },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "DEBIT",
          amount: w.amount,
          description: `Withdrawal paid (${w.method})`,
          withdrawalId: id,
          balanceAfter: wallet.pendingBalance - w.amount,
        },
      });
    });

    await createNotification({
      userId: w.teacherId,
      type: "WITHDRAWAL_APPROVED",
      title: "Withdrawal paid 💸",
      body: `৳${w.amount.toLocaleString()} has been sent to your ${w.method} account.`,
    });
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "withdrawal.pay",
      entityType: "Withdrawal",
      entityId: id,
      metadata: { amount: w.amount },
    });
    revalidatePath("/admin/withdrawals");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Reject a withdrawal — held funds return to the teacher's available balance. */
export async function rejectWithdrawal(id: string, reason: string): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const w = await db.withdrawal.findUnique({ where: { id } });
    if (!w) return actionError("Withdrawal not found.");
    if (!["PENDING", "APPROVED"].includes(w.status)) return actionError("This withdrawal can no longer be rejected.");
    if (!reason.trim()) return actionError("A rejection reason is required.");

    const wallet = await db.teacherWallet.findUnique({ where: { teacherId: w.teacherId } });

    await db.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id },
        data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: actor.id, rejectionReason: reason.trim() },
      });
      if (wallet) {
        await tx.teacherWallet.update({
          where: { id: wallet.id },
          data: {
            pendingBalance: { decrement: w.amount },
            availableBalance: { increment: w.amount },
          },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "CREDIT",
            amount: w.amount,
            description: "Withdrawal rejected — funds returned",
            withdrawalId: id,
            balanceAfter: wallet.availableBalance + w.amount,
          },
        });
      }
    });

    await createNotification({
      userId: w.teacherId,
      type: "WITHDRAWAL_REJECTED",
      title: "Withdrawal rejected",
      body: `${reason.trim()} The funds returned to your available balance.`,
    });
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "withdrawal.reject",
      entityType: "Withdrawal",
      entityId: id,
      metadata: { reason: reason.trim() },
    });
    revalidatePath("/admin/withdrawals");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
