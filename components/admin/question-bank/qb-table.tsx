import { Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Question } from "@/db/schema";
import { QbActiveSwitch } from "./qb-active-switch";
import { QbRowActions } from "./qb-row-actions";
import { questionType } from "./qb-meta";

function TypeBadge({ item }: { item: Question }) {
  const type = questionType(item);
  if (type === "Aptitude") return <Badge variant="default">Aptitude</Badge>;
  if (type === "Figural") {
    return (
      <Badge variant="secondary">
        <ImageIcon data-icon="inline-start" />
        Figural
      </Badge>
    );
  }
  return <Badge variant="outline">Likert</Badge>;
}

/** Group questions by dimension, preserving the incoming (sorted) order. */
function groupByDimension(items: Question[]): Array<[string, Question[]]> {
  const groups = new Map<string, Question[]>();
  for (const item of items) {
    const existing = groups.get(item.dimension);
    if (existing) existing.push(item);
    else groups.set(item.dimension, [item]);
  }
  return Array.from(groups.entries());
}

export function QbTable({ items }: { items: Question[] }) {
  const groups = groupByDimension(items);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-hidden rounded-md border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[42%]">Question</TableHead>
            <TableHead>Dimension</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map(([dimension, rows]) => (
            <DimensionGroup key={dimension} dimension={dimension} rows={rows} />
          ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}

function DimensionGroup({
  dimension,
  rows,
}: {
  dimension: string;
  rows: Question[];
}) {
  return (
    <>
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={6} className="bg-muted/50 py-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {dimension}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {rows.length} {rows.length === 1 ? "item" : "items"}
            </span>
          </div>
        </TableCell>
      </TableRow>
      {rows.map((item) => (
        <TableRow key={item.id}>
          <TableCell className="max-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block truncate font-medium">
                  {item.questionText}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                {item.questionText}
              </TooltipContent>
            </Tooltip>
          </TableCell>
          <TableCell>
            <Badge variant="outline" className="font-mono">
              {item.dimension}
            </Badge>
          </TableCell>
          <TableCell>
            <TypeBadge item={item} />
          </TableCell>
          <TableCell className="whitespace-nowrap text-muted-foreground">
            {item.source} <span className="text-xs">v{item.version}</span>
          </TableCell>
          <TableCell>
            <QbActiveSwitch id={item.id} isActive={item.isActive} />
          </TableCell>
          <TableCell className="text-right">
            <QbRowActions item={item} />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
