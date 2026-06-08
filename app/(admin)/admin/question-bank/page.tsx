import Link from "next/link";
import { and, asc, count, eq, ilike, type SQL } from "drizzle-orm";
import { FileQuestion, Layers, ListChecks, Sparkles } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/shell/page-header";
import { StatCard } from "@/components/admin/shell/stat-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/db";
import { questionBank } from "@/db/schema";
import { QbFilters } from "@/components/admin/question-bank/qb-filters";
import { QbPagination } from "@/components/admin/question-bank/qb-pagination";
import { QbTable } from "@/components/admin/question-bank/qb-table";
import { QuestionBankForm } from "@/components/admin/question-bank/question-bank-form";
import {
  MODULES,
  moduleLabel,
  type ModuleValue,
} from "@/components/admin/question-bank/qb-meta";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type SearchParams = Promise<{
  module?: string;
  dimension?: string;
  active?: string;
  q?: string;
  page?: string;
}>;

function isModule(value: string | undefined): value is ModuleValue {
  return value === "interests" || value === "work_style" || value === "aptitude";
}

export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const activeModule: ModuleValue = isModule(sp.module) ? sp.module : "interests";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  // Visible-rows filters: the active module tab + dimension/active/search.
  const conds: SQL[] = [eq(questionBank.module, activeModule)];
  if (sp.dimension) conds.push(eq(questionBank.dimension, sp.dimension));
  if (sp.active === "true" || sp.active === "false") {
    conds.push(eq(questionBank.isActive, sp.active === "true"));
  }
  if (sp.q) conds.push(ilike(questionBank.questionText, `%${sp.q}%`));

  // All three reads run in parallel: per-module totals (for stats/tab counts),
  // the filtered count (for pagination), and just the current page of rows.
  const [allRows, filteredCount, items] = await Promise.all([
    db
      .select({ id: questionBank.id, module: questionBank.module, isActive: questionBank.isActive })
      .from(questionBank),
    db.select({ total: count() }).from(questionBank).where(and(...conds)),
    db
      .select()
      .from(questionBank)
      .where(and(...conds))
      .orderBy(asc(questionBank.dimension), asc(questionBank.questionText))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ]);
  const filteredTotal = filteredCount[0]?.total ?? 0;

  const totals = {
    all: allRows.length,
    active: allRows.filter((r) => r.isActive).length,
    interests: allRows.filter((r) => r.module === "interests").length,
    work_style: allRows.filter((r) => r.module === "work_style").length,
    aptitude: allRows.filter((r) => r.module === "aptitude").length,
  };

  const filtersApplied = Boolean(sp.dimension || sp.active || sp.q);

  function tabHref(module: ModuleValue) {
    const params = new URLSearchParams();
    params.set("module", module);
    return `?${params.toString()}`;
  }

  // Preserve the active module + filters when paging; only the page changes.
  function hrefForPage(p: number) {
    const params = new URLSearchParams();
    params.set("module", activeModule);
    if (sp.dimension) params.set("dimension", sp.dimension);
    if (sp.active === "true" || sp.active === "false") params.set("active", sp.active);
    if (sp.q) params.set("q", sp.q);
    if (p > 1) params.set("page", String(p));
    return `?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Question Bank"
        description="Author and curate the profiling items students answer — grouped by assessment module and scoring dimension."
        actions={<QuestionBankForm defaultModule={activeModule} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total items" value={totals.all} icon={ListChecks} />
        <StatCard
          label="Active"
          value={totals.active}
          icon={Sparkles}
          hint={`${totals.all - totals.active} inactive`}
        />
        <StatCard label="Interests" value={totals.interests} icon={Layers} />
        <StatCard label="Work Style" value={totals.work_style} icon={Layers} />
        <StatCard label="Aptitude" value={totals.aptitude} icon={Layers} />
      </div>

      <Tabs value={activeModule} className="flex flex-col gap-4">
        <TabsList className="w-full sm:w-auto">
          {MODULES.map((m) => (
            <TabsTrigger key={m.value} value={m.value} asChild>
              <Link href={tabHref(m.value)} scroll={false}>
                {m.label}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {totals[m.value]}
                </span>
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>

        <p className="text-sm text-muted-foreground">
          {MODULES.find((m) => m.value === activeModule)?.description}
        </p>

        <QbFilters />

        {items.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileQuestion />
              </EmptyMedia>
              <EmptyTitle>
                {filtersApplied
                  ? "No items match these filters"
                  : `No ${moduleLabel(activeModule)} items yet`}
              </EmptyTitle>
              <EmptyDescription>
                {filtersApplied
                  ? "Try clearing the dimension, status, or search filters to see more items."
                  : `Create the first ${moduleLabel(activeModule)} item to start building this module.`}
              </EmptyDescription>
            </EmptyHeader>
            {!filtersApplied ? (
              <EmptyContent>
                <QuestionBankForm
                  defaultModule={activeModule}
                  trigger={<Button variant="outline">Add an item</Button>}
                />
              </EmptyContent>
            ) : null}
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            <QbTable items={items} />
            <QbPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filteredTotal}
              hrefForPage={hrefForPage}
            />
          </div>
        )}
      </Tabs>
    </div>
  );
}
