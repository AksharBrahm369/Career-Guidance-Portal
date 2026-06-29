"use client";

import { useState } from "react";
import { Loader2, Lock, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginForm({ showInitialError = false }: { showInitialError?: boolean }) {
  const [error, setError] = useState(showInitialError);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(false);
    setBusy(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: String(formData.get("username") ?? ""),
          password: String(formData.get("password") ?? ""),
        }),
      });

      if (!res.ok) {
        setError(true);
        return;
      }

      window.location.assign("/admin");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-username">Username</Label>
        <div className="relative">
          <UserRound
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="admin-username"
            name="username"
            type="text"
            required
            autoComplete="username"
            placeholder="e.g. sevak@hp"
            className="h-11 pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Use the exact admin username created with <code>pnpm create-admin</code>.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-password">Password</Label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="admin-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="h-11 pl-9"
          />
        </div>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          Invalid admin username or password. Please use the exact seeded username.
        </p>
      ) : null}
      <Button type="submit" disabled={busy} aria-busy={busy} className="h-11 w-full">
        {busy ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
