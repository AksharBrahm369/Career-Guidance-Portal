import Link from "next/link";

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
      className={`flex items-center justify-between text-sm ${className ?? ""}`}
    >
      {prevDisabled ? (
        <span aria-hidden className="text-muted-foreground">
          ← Previous
        </span>
      ) : (
        <Link href={hrefForPage(page - 1)} className="rounded-md border px-3 py-1.5">
          ← Previous
        </Link>
      )}
      <span className="text-xs text-muted-foreground">
        Page {page} / {pageCount}
      </span>
      {nextDisabled ? (
        <span aria-hidden className="text-muted-foreground">
          Next →
        </span>
      ) : (
        <Link href={hrefForPage(page + 1)} className="rounded-md border px-3 py-1.5">
          Next →
        </Link>
      )}
    </nav>
  );
}
