export function ComingSoon({
  title,
  milestone = "M2",
  description,
}: {
  title: string;
  milestone?: string;
  description?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Coming in {milestone}
      </span>
      <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
      {description ? (
        <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
      ) : null}
    </div>
  );
}
