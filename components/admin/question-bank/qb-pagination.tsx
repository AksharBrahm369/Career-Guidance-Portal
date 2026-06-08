import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

/** First, last, current ±1, with ellipses — collapses long ranges. */
function pageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = [1, total, current, current - 1, current + 1].filter((p) => p >= 1 && p <= total);
  const sorted = [...new Set(wanted)].sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

/**
 * Server-rendered pagination for the question bank. Uses Next <Link> (SPA nav)
 * styled with buttonVariants inside the shadcn Pagination structure.
 */
export function QbPagination({
  page,
  pageSize,
  total,
  hrefForPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefForPage: (p: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const items = pageList(page, totalPages);
  const stepCls = cn(buttonVariants({ variant: "ghost", size: "default" }), "gap-1");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium tabular-nums text-foreground">{start}–{end}</span> of{" "}
        <span className="font-medium tabular-nums text-foreground">{total}</span>
      </p>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            {page > 1 ? (
              <Link href={hrefForPage(page - 1)} scroll={false} className={cn(stepCls, "pl-2.5")} aria-label="Previous page">
                <ChevronLeft className="size-4" /> <span>Prev</span>
              </Link>
            ) : (
              <span className={cn(stepCls, "pl-2.5 pointer-events-none opacity-50")} aria-disabled>
                <ChevronLeft className="size-4" /> <span>Prev</span>
              </span>
            )}
          </PaginationItem>

          {items.map((it, i) =>
            it === "ellipsis" ? (
              <PaginationItem key={`e-${i}`} className="hidden sm:block">
                <span className="flex size-9 items-center justify-center text-muted-foreground">…</span>
              </PaginationItem>
            ) : (
              <PaginationItem key={it} className="hidden sm:block">
                <Link
                  href={hrefForPage(it)}
                  scroll={false}
                  aria-current={it === page ? "page" : undefined}
                  className={cn(buttonVariants({ variant: it === page ? "outline" : "ghost", size: "icon" }), "tabular-nums")}
                >
                  {it}
                </Link>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            {page < totalPages ? (
              <Link href={hrefForPage(page + 1)} scroll={false} className={cn(stepCls, "pr-2.5")} aria-label="Next page">
                <span>Next</span> <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className={cn(stepCls, "pr-2.5 pointer-events-none opacity-50")} aria-disabled>
                <span>Next</span> <ChevronRight className="size-4" />
              </span>
            )}
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
