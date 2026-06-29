import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageLoader({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex min-h-[40vh] items-center justify-center p-6", className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex min-w-48 items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        </span>
        <span className="font-medium">{label}</span>
      </div>
    </div>
  );
}

export function AuthSkeleton() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="h-4 w-52 max-w-full" />
      </div>
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading admin page">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 shadow-sm">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-5 h-8 w-16" />
            <Skeleton className="mt-3 h-4 w-32" />
          </div>
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}

export function CoursesSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading courses">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-11 w-full sm:w-72" />
        <Skeleton className="h-11 w-36" />
        <Skeleton className="h-11 w-36" />
      </div>
      <CourseCardsSkeleton />
    </div>
  );
}

export function CourseDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading course details">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full max-w-2xl" />
        <Skeleton className="h-4 w-full max-w-3xl" />
        <Skeleton className="h-4 w-2/3 max-w-2xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  );
}

export function AssessmentSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading assessment">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="rounded-lg border bg-card p-5">
        <Skeleton className="h-6 w-56" />
        <div className="mt-6 grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b p-4">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="divide-y">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 p-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-20 justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CourseCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex min-h-[11rem] flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm"
        >
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="mt-auto flex gap-4 pt-1">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
