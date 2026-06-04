"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function StudentAuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState("11");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/student/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email: email || undefined, grade: Number(grade), password }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error === "already_registered" ? "That email is already registered." : "Sign-up failed.");
          return;
        }
        const r = await signIn("student", { identifier: email, password, redirect: false });
        if (r?.error) { setError("Signed up, but auto-login failed — try logging in."); return; }
      } else {
        const r = await signIn("student", { identifier, password, redirect: false });
        if (r?.error) { setError("Invalid email/phone or password."); return; }
      }
      router.push("/assessment");
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {mode === "signup" ? (
        <>
          <input className={inputCls} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <select className={inputCls} value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="11">Class 11</option>
            <option value="12">Class 12</option>
          </select>
        </>
      ) : (
        <input className={inputCls} placeholder="Email or phone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
      )}
      <input className={inputCls} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <button type="submit" disabled={busy} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
        {busy ? "…" : mode === "signup" ? "Create account" : "Log in"}
      </button>
    </form>
  );
}
