"use client";

import { useEffect, useState, useTransition } from "react";
import { BookOpen, ExternalLink, Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ResourceType = "YouTube Video" | "Website" | "Free Course" | "Tutorial";
type Language = "English" | "Hindi" | "Mixed";
type Difficulty = "Beginner" | "Intermediate";
type Status = "draft" | "published";

interface LearningResource {
  id: string;
  courseId: string;
  title: string;
  url: string;
  platform: string;
  resourceType: ResourceType;
  description: string;
  thumbnailUrl: string | null;
  language: Language;
  difficulty: Difficulty;
  isFree: boolean;
  status: Status;
  source: "ai" | "manual";
  updatedAt: string;
}

interface FormState {
  title: string;
  url: string;
  platform: string;
  resourceType: ResourceType;
  description: string;
  thumbnailUrl: string;
  language: Language;
  difficulty: Difficulty;
  isFree: boolean;
}

const EMPTY_FORM: FormState = {
  title: "",
  url: "",
  platform: "",
  resourceType: "Website",
  description: "",
  thumbnailUrl: "",
  language: "English",
  difficulty: "Beginner",
  isFree: true,
};

const RESOURCE_TYPES: ResourceType[] = ["YouTube Video", "Website", "Free Course", "Tutorial"];
const LANGUAGES: Language[] = ["English", "Hindi", "Mixed"];
const DIFFICULTIES: Difficulty[] = ["Beginner", "Intermediate"];

export function LearningResourcesManager({
  courseId,
  courseName,
}: {
  courseId: string;
  courseName: string;
}) {
  const [open, setOpen] = useState(false);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [transitioning, startTransition] = useTransition();

  useEffect(() => {
    if (open) void loadResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, courseId]);

  async function loadResources() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/learning-resources`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      setResources(data.resources ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function fetchResources() {
    setFetching(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/learning-resources/fetch`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      const warningText = data.warnings?.length > 0 ? ` Warnings: ${data.warnings.join(" ")}` : "";
      setNotice(
        `${data.resources?.length ?? 0} draft resource${
          data.resources?.length === 1 ? "" : "s"
        } fetched via ${data.provider ?? "resource fetch"}.${warningText}`,
      );
      await loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetching(false);
    }
  }

  async function addManualResource(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const payload = payloadFromForm(form);
    const res = await fetch(`/api/admin/courses/${courseId}/learning-resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.message ?? data.detail ?? data.error ?? `HTTP ${res.status}`);
      return;
    }
    setForm(EMPTY_FORM);
    setAdding(false);
    setNotice(data.warning ?? "Resource saved as draft.");
    await loadResources();
  }

  async function saveResource(resource: LearningResource) {
    setPendingId(resource.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/learning-resources/${resource.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromResource(resource)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? data.detail ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      setNotice("Resource saved.");
      await loadResources();
    } finally {
      setPendingId(null);
    }
  }

  async function setStatus(resource: LearningResource, status: Status) {
    setPendingId(resource.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/learning-resources/${resource.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? data.detail ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      setNotice(status === "published" ? "Resource published." : "Resource unpublished.");
      await loadResources();
    } finally {
      setPendingId(null);
    }
  }

  async function deleteResource(resource: LearningResource) {
    if (!window.confirm("Delete this learning resource?")) return;
    setPendingId(resource.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/learning-resources/${resource.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      setNotice("Resource deleted.");
      await loadResources();
    } finally {
      setPendingId(null);
    }
  }

  function updateResource(id: string, patch: Partial<LearningResource>) {
    setResources((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  const busy = loading || fetching || transitioning;
  const publishedCount = resources.filter((resource) => resource.status === "published").length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <BookOpen className="size-3.5" aria-hidden="true" />
          Resources
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Learning resources</DialogTitle>
          <DialogDescription>
            {courseName} · {publishedCount} published / {resources.length} total
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={fetchResources} disabled={busy}>
            {fetching ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCcw aria-hidden="true" />
            )}
            Fetch Learning Resources
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAdding((value) => !value)}
            disabled={busy}
          >
            <Plus aria-hidden="true" />
            Add manually
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => startTransition(() => void loadResources())}
            disabled={busy}
          >
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
            {notice}
          </div>
        ) : null}

        {adding ? (
          <form
            onSubmit={addManualResource}
            className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
          >
            <Field label="Title" required>
              <input
                required
                className={inputCls}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="URL" required>
              <input
                required
                type="url"
                className={inputCls}
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </Field>
            <Field label="Platform" required>
              <input
                required
                className={inputCls}
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
              />
            </Field>
            <Field label="Type">
              <Select
                value={form.resourceType}
                options={RESOURCE_TYPES}
                onChange={(value) => setForm({ ...form, resourceType: value })}
              />
            </Field>
            <Field label="Language">
              <Select
                value={form.language}
                options={LANGUAGES}
                onChange={(value) => setForm({ ...form, language: value })}
              />
            </Field>
            <Field label="Difficulty">
              <Select
                value={form.difficulty}
                options={DIFFICULTIES}
                onChange={(value) => setForm({ ...form, difficulty: value })}
              />
            </Field>
            <Field label="Thumbnail URL">
              <input
                type="url"
                className={inputCls}
                value={form.thumbnailUrl}
                onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
              />
              Free resource
            </label>
            <Field label="Description" required full>
              <textarea
                required
                rows={3}
                className={inputCls}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" size="sm">
                Save draft
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
            Loading resources...
          </div>
        ) : resources.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No resources yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {resources.map((resource) => (
              <div key={resource.id} className="grid gap-3 rounded-lg border p-3 lg:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <Tag>{resource.status}</Tag>
                    <Tag>{resource.source}</Tag>
                    <Tag>{resource.resourceType}</Tag>
                    <Tag>{resource.language}</Tag>
                    <Tag>{resource.difficulty}</Tag>
                    {!resource.isFree ? <Tag>paid</Tag> : null}
                  </div>
                  <Field label="Title" required>
                    <input
                      className={inputCls}
                      value={resource.title}
                      onChange={(e) => updateResource(resource.id, { title: e.target.value })}
                    />
                  </Field>
                  <Field label="Description" required>
                    <textarea
                      rows={4}
                      className={inputCls}
                      value={resource.description}
                      onChange={(e) => updateResource(resource.id, { description: e.target.value })}
                    />
                  </Field>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="URL" required full>
                    <input
                      type="url"
                      className={inputCls}
                      value={resource.url}
                      onChange={(e) => updateResource(resource.id, { url: e.target.value })}
                    />
                  </Field>
                  <Field label="Platform" required>
                    <input
                      className={inputCls}
                      value={resource.platform}
                      onChange={(e) => updateResource(resource.id, { platform: e.target.value })}
                    />
                  </Field>
                  <Field label="Type">
                    <Select
                      value={resource.resourceType}
                      options={RESOURCE_TYPES}
                      onChange={(value) => updateResource(resource.id, { resourceType: value })}
                    />
                  </Field>
                  <Field label="Language">
                    <Select
                      value={resource.language}
                      options={LANGUAGES}
                      onChange={(value) => updateResource(resource.id, { language: value })}
                    />
                  </Field>
                  <Field label="Difficulty">
                    <Select
                      value={resource.difficulty}
                      options={DIFFICULTIES}
                      onChange={(value) => updateResource(resource.id, { difficulty: value })}
                    />
                  </Field>
                  <Field label="Thumbnail URL" full>
                    <input
                      type="url"
                      className={inputCls}
                      value={resource.thumbnailUrl ?? ""}
                      onChange={(e) =>
                        updateResource(resource.id, { thumbnailUrl: e.target.value || null })
                      }
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={resource.isFree}
                      onChange={(e) => updateResource(resource.id, { isFree: e.target.checked })}
                    />
                    Free resource
                  </label>
                  <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                    <Button asChild type="button" size="sm" variant="ghost">
                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                        Open
                        <ExternalLink aria-hidden="true" />
                      </a>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pendingId === resource.id}
                      onClick={() => saveResource(resource)}
                    >
                      {pendingId === resource.id ? (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                      ) : null}
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={resource.status === "published" ? "outline" : "default"}
                      disabled={pendingId === resource.id}
                      onClick={() =>
                        setStatus(resource, resource.status === "published" ? "draft" : "published")
                      }
                    >
                      {resource.status === "published" ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={pendingId === resource.id}
                      onClick={() => deleteResource(resource)}
                    >
                      <Trash2 aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function payloadFromForm(form: FormState) {
  return {
    ...form,
    thumbnailUrl: form.thumbnailUrl.trim() || null,
    status: "draft",
    source: "manual",
  };
}

function payloadFromResource(resource: LearningResource) {
  return {
    title: resource.title,
    url: resource.url,
    platform: resource.platform,
    resourceType: resource.resourceType,
    description: resource.description,
    thumbnailUrl: resource.thumbnailUrl,
    language: resource.language,
    difficulty: resource.difficulty,
    isFree: resource.isFree,
    status: resource.status,
  };
}

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function Field({
  label,
  children,
  required,
  full,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-muted px-2 py-0.5">{children}</span>;
}

const inputCls = "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm";
