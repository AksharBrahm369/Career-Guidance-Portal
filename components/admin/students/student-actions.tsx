"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  KeyRoundIcon,
  Loader2,
  ShieldBanIcon,
  ShieldCheckIcon,
  TimerResetIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  studentId: string;
  banned: boolean;
}

async function postAction(url: string, body?: unknown): Promise<boolean> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    toast.error(data.detail ?? data.error ?? `Request failed (${res.status})`);
    return false;
  }
  return true;
}

export function StudentActions({ studentId, banned }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Reset-password dialog state.
  const [pwOpen, setPwOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  const base = `/api/admin/students/${studentId}`;

  function run(label: string, fn: () => Promise<boolean>) {
    startTransition(async () => {
      const ok = await fn();
      if (ok) {
        toast.success(label);
        router.refresh();
      }
    });
  }

  function toggleBan() {
    run(banned ? "Student unbanned" : "Student banned", () =>
      postAction(`${base}/ban`, { ban: !banned, reason: banned ? undefined : "Banned by admin" }),
    );
  }

  function resetCooldown() {
    run("Assessment cooldown cleared", () => postAction(`${base}/reset-cooldown`));
  }

  function submitPassword() {
    setPwError(null);
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    startTransition(async () => {
      const ok = await postAction(`${base}/reset-password`, { newPassword });
      if (ok) {
        toast.success("Password reset");
        setNewPassword("");
        setPwOpen(false);
        router.refresh();
      }
    });
  }

  function deleteStudent() {
    startTransition(async () => {
      const res = await fetch(base, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.detail ?? data.error ?? `Request failed (${res.status})`);
        return;
      }
      toast.success("Student deleted");
      router.push("/admin/students");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={toggleBan} disabled={pending}>
        {banned ? (
          <ShieldCheckIcon data-icon="inline-start" />
        ) : (
          <ShieldBanIcon data-icon="inline-start" />
        )}
        {banned ? "Unban" : "Ban"}
      </Button>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={pending}>
            <KeyRoundIcon data-icon="inline-start" />
            Reset password
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for this student. They can change it after signing in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-invalid={pwError ? true : undefined}
              autoComplete="new-password"
            />
            {pwError ? <p className="text-sm text-destructive">{pwError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submitPassword} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Set password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="outline" size="sm" onClick={resetCooldown} disabled={pending}>
        <TimerResetIcon data-icon="inline-start" />
        Reset cooldown
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={pending}>
            <Trash2Icon data-icon="inline-start" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this student?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the student account and all of their assessment data. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteStudent}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
