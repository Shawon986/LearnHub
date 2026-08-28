"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { changePassword } from "@/lib/actions/student";

export function TeacherPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = String(form.get("newPassword"));
    if (next !== String(form.get("confirmPassword"))) {
      setError("New passwords do not match.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await changePassword({
        currentPassword: String(form.get("currentPassword")),
        newPassword: next,
      });
      if (result.ok) {
        toast({ title: "Password changed", variant: "success" });
        (e.target as HTMLFormElement).reset();
      } else {
        setError(result.error ?? "Could not change password.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Minimum 8 characters with a letter and a number.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Current password" type="password" name="currentPassword" autoComplete="current-password" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="New password" type="password" name="newPassword" autoComplete="new-password" required />
            <Input label="Confirm new password" type="password" name="confirmPassword" autoComplete="new-password" required />
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" loading={pending} variant="secondary">
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
