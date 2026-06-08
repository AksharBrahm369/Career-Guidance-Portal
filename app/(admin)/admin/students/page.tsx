import Link from "next/link";
import {
  CheckCircle2Icon,
  EyeIcon,
  GraduationCapIcon,
  MoreHorizontalIcon,
  ShieldBanIcon,
  UsersIcon,
} from "lucide-react";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { user } from "@/db/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPageHeader } from "@/components/admin/shell/page-header";
import { StatCard } from "@/components/admin/shell/stat-card";
import { StudentSearch } from "@/components/admin/students/student-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // The data queries don't depend on the admin's identity, so start them while
  // the auth round-trip is in flight, then gate the response on auth.
  const authPromise = requireAdmin();
  const { q } = await searchParams;
  const query = q?.trim();

  const filters = [eq(user.role, "student")];
  if (query) {
    const like = `%${query}%`;
    filters.push(or(ilike(user.name, like), ilike(user.phoneNumber, like))!);
  }

  const dataPromise = Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        grade: user.grade,
        banned: user.banned,
        lastAssessmentAt: user.lastAssessmentAt,
      })
      .from(user)
      .where(and(...filters))
      .orderBy(desc(user.createdAt))
      .limit(200),
    db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${user.lastAssessmentAt} is not null)::int`,
        banned: sql<number>`count(*) filter (where ${user.banned})::int`,
      })
      .from(user)
      .where(eq(user.role, "student")),
  ]);

  await authPromise;
  const [students, [stats]] = await dataPromise;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Students"
        description="View and manage student accounts and their assessment status."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total students" value={stats?.total ?? 0} icon={UsersIcon} />
        <StatCard
          label="Completed assessments"
          value={stats?.completed ?? 0}
          icon={CheckCircle2Icon}
        />
        <StatCard label="Banned" value={stats?.banned ?? 0} icon={ShieldBanIcon} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <StudentSearch />
          <p className="text-sm text-muted-foreground">
            {students.length} {students.length === 1 ? "student" : "students"}
            {query ? ` matching “${query}”` : ""}
          </p>
        </div>

        {students.length === 0 ? (
          <Alert>
            <UsersIcon className="size-4" />
            <AlertTitle>No students found</AlertTitle>
            <AlertDescription>
              {query
                ? "No student matches your search. Try a different name or phone number."
                : "No students have signed up yet."}
            </AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link
                          href={`/admin/students/${s.id}`}
                          className="flex items-center gap-3 font-medium hover:underline"
                        >
                          <Avatar className="size-9">
                            <AvatarFallback className="text-xs font-medium">
                              {initials(s.name)}
                            </AvatarFallback>
                          </Avatar>
                          {s.name}
                        </Link>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {s.phoneNumber ?? "—"}
                      </TableCell>
                      <TableCell>
                        {s.grade != null ? (
                          <Badge variant="outline">
                            <GraduationCapIcon className="size-3" />
                            Grade {s.grade}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.lastAssessmentAt ? (
                          <Badge variant="secondary">
                            Completed {formatDate(s.lastAssessmentAt)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Not started
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.banned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontalIcon />
                              <span className="sr-only">Open actions for {s.name}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/students/${s.id}`}>
                                  <EyeIcon />
                                  View student
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
