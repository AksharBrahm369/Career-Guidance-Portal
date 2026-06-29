import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  pageCount: number;
  /** Builds the href for a given page. Receives the target page number. */
  hrefForPage: (page: number) => string;
  className?: string;
}

export function Pagination({ page, pageCount, hrefForPage, className }: Props) {
  if (pageCount <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= pageCount;

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-col items-stretch gap-3 text-sm sm:flex-row sm:items-center sm:justify-between ${className ?? ""}`}
    >
      {prevDisabled ? (
        <span
          aria-disabled="true"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border bg-muted/40 px-3 text-muted-foreground sm:justify-start"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Previous
        </span>
      ) : (
        <Link
          href={hrefForPage(page - 1)}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border bg-background px-3 font-medium shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:justify-start"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Previous
        </Link>
      )}
      <span className="text-center text-xs text-muted-foreground">
        Page {page} / {pageCount}
      </span>
      {nextDisabled ? (
        <span
          aria-disabled="true"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border bg-muted/40 px-3 text-muted-foreground sm:justify-end"
        >
          Next
          <ChevronRight className="size-4" aria-hidden />
        </span>
      ) : (
        <Link
          href={hrefForPage(page + 1)}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border bg-background px-3 font-medium shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:justify-end"
        >
          Next
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}
    </nav>
  );
}
