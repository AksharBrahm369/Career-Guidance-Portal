"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Username
        <Input name="username" type="text" required autoComplete="username" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <Input name="password" type="password" required autoComplete="current-password" />
      </label>
      {error ? (
        <p className="text-sm text-destructive">Invalid credentials. Please try again.</p>
      ) : null}
      <Button type="submit" disabled={busy} aria-busy={busy} className="w-full">
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
