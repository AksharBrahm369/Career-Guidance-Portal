"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface Props {
  id: string;
  isActive: boolean;
}

export function QbActiveSwitch({ id, isActive }: Props) {
  const router = useRouter();
  const [, start] = useTransition();
  const [checked, setChecked] = useState(isActive);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    setBusy(true);
    setChecked(next); // optimistic
    const res = await fetch(`/api/admin/question-bank/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    setBusy(false);
    if (!res.ok) {
      setChecked(!next); // revert
      const data = await res.json().catch(() => ({}));
      toast.error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      return;
    }
    toast.success(next ? "Activated" : "Deactivated");
    start(() => router.refresh());
  }

  return (
    <Switch
      checked={checked}
      disabled={busy}
      onCheckedChange={toggle}
      aria-label={checked ? "Active" : "Inactive"}
    />
  );
}
