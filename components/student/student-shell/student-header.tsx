"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Loader2, LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV = [
  { href: "/student", label: "Dashboard" },
  { href: "/courses", label: "Courses" },
  { href: "/assessment", label: "Assessment" },
] as const;

function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className="flex items-center gap-2 rounded-md font-heading text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Compass className="size-5" aria-hidden="true" />
      </span>
      <span>Career Portal</span>
    </Link>
  );
}

export function StudentHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/session/sign-out", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } finally {
      window.location.replace("/student/login");
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />

        {/* Desktop nav + account */}
        <div className="hidden items-center gap-1 sm:flex">
          <nav className="flex items-center gap-1" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={signOut}
            disabled={signingOut}
            aria-busy={signingOut}
            className="ml-1 gap-2 text-muted-foreground hover:text-foreground"
          >
            {signingOut ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="size-4" aria-hidden="true" />
            )}
            {signingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>

        {/* Mobile menu */}
        <div className="sm:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Open menu"
              >
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader className="text-left">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Wordmark onClick={() => setOpen(false)} />
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1" aria-label="Primary">
                {NAV.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={cn(
                        "flex h-12 items-center rounded-lg px-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive(item.href)
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <Button
                type="button"
                variant="outline"
                onClick={signOut}
                disabled={signingOut}
                aria-busy={signingOut}
                className="mt-6 h-12 w-full justify-start gap-2"
              >
                {signingOut ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="size-4" aria-hidden="true" />
                )}
                {signingOut ? "Signing out..." : "Sign out"}
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
