"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Search box for the students list. Debounces input and pushes `?q=` so the
 * server component re-queries. Kept deliberately small — no client-side fetch.
 */
export function StudentSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [, startTransition] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      // Read the LIVE params at fire time (not the render-time closure) so a
      // concurrent param change during the 300ms debounce isn't clobbered, and
      // the effect genuinely depends only on `value`.
      const next = new URLSearchParams(window.location.search);
      const trimmed = value.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      next.delete("offset");
      const query = next.toString();
      startTransition(() => router.replace(query ? `/admin/students?${query}` : "/admin/students"));
    }, 300);
    return () => clearTimeout(handle);
  }, [value, router]);

  return (
    <div className="relative max-w-sm">
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search name or phone…"
        className="pl-9"
        aria-label="Search students"
      />
    </div>
  );
}
