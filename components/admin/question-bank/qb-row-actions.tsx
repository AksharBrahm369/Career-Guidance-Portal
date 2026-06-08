"use client";

import { Pencil, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import type { Question } from "@/db/schema";

// The edit form is heavy (Dialog + Select + Field set + several inputs). Load
// its chunk on demand — and only mount it once a row's Edit dialog is opened —
// so the question-bank route doesn't ship N closed form trees per page.
const QuestionBankForm = dynamic(() =>
  import("./question-bank-form").then((m) => m.QuestionBankForm),
);

interface Props {
  item: Question;
}

export function QbRowActions({ item }: Props) {
  const router = useRouter();
  const [, start] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  async function onDelete() {
    setDeleting(true);
    const res = await fetch(`/api/admin/question-bank/${item.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      return;
    }
    toast.success("Item deleted");
    start(() => router.refresh());
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Edit item"
        onClick={() => setEditOpen(true)}
      >
        <Pencil />
      </Button>
      {editOpen ? (
        <QuestionBankForm item={item} open={editOpen} onOpenChange={setEditOpen} />
      ) : null}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Delete item">
            <Trash2 />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the question from the bank. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
              disabled={deleting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
