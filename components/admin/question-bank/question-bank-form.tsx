"use client";

import { CircleDot, GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Question } from "@/db/schema";
import { type ModuleValue } from "./qb-meta";

type OptionRow = { id: string; text: string };

const LIKERT_DEFAULTS: OptionRow[] = [
  { id: "1", text: "Strongly dislike" },
  { id: "2", text: "Dislike" },
  { id: "3", text: "Unsure" },
  { id: "4", text: "Like" },
  { id: "5", text: "Strongly like" },
];

const APTITUDE_DEFAULTS: OptionRow[] = [
  { id: "a", text: "" },
  { id: "b", text: "" },
];

/** Build the self-report scoringMap from option ids + a single dimension: { "1": {dim:1}, ... }. */
function buildScoringMap(
  options: OptionRow[],
  dimension: string,
): Record<string, Record<string, number>> {
  const map: Record<string, Record<string, number>> = {};
  options.forEach((o, i) => {
    map[o.id] = { [dimension]: i + 1 };
  });
  return map;
}

interface Props {
  /** Provided in edit mode; omit for create. */
  item?: Question;
  /** Pre-selects the module when creating a new item (e.g. the active tab). */
  defaultModule?: ModuleValue;
  trigger?: React.ReactNode;
  /** Controlled open state — when provided, the parent owns visibility (enables lazy-mounting). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QuestionBankForm({
  item,
  defaultModule,
  trigger,
  open: openProp,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const editing = Boolean(item);
  const [module, setModule] = useState<ModuleValue>(
    (item?.module as ModuleValue) ?? defaultModule ?? "interests",
  );
  const [dimension, setDimension] = useState(item?.dimension ?? "");
  const [questionText, setQuestionText] = useState(item?.questionText ?? "");
  const [options, setOptions] = useState<OptionRow[]>(
    item?.options ?? (defaultModule === "aptitude" ? APTITUDE_DEFAULTS : LIKERT_DEFAULTS),
  );
  const [correctOptionId, setCorrectOptionId] = useState(item?.correctOptionId ?? "");
  const [source, setSource] = useState(item?.source ?? "authored");
  const [license, setLicense] = useState(item?.license ?? "");
  const [version, setVersion] = useState(String(item?.version ?? 1));
  const [poolGroup, setPoolGroup] = useState(item?.poolGroup ?? "");
  const [mediaStem, setMediaStem] = useState(item?.media?.stem ?? "");
  const [mediaOptions, setMediaOptions] = useState<Record<string, string>>(
    item?.media?.options ?? {},
  );

  const isAptitude = module === "aptitude";

  function onModuleChange(next: ModuleValue) {
    setModule(next);
    // when there's no existing item, seed sensible default option rows per module
    if (!editing) {
      if (next === "aptitude") {
        setOptions(APTITUDE_DEFAULTS);
        setCorrectOptionId("");
      } else {
        setOptions(LIKERT_DEFAULTS);
      }
    }
  }

  function setOption(index: number, patch: Partial<OptionRow>) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function addOption() {
    setOptions((prev) => [...prev, { id: "", text: "" }]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit() {
    const trimmedOptions = options
      .map((o) => ({ id: o.id.trim(), text: o.text.trim() }))
      .filter((o) => o.id !== "" || o.text !== "");

    const media: { stem?: string; options?: Record<string, string> } = {};
    if (mediaStem.trim()) media.stem = mediaStem.trim();
    const cleanedMediaOptions = Object.fromEntries(
      Object.entries(mediaOptions).filter(([, v]) => v && v.trim() !== ""),
    );
    if (Object.keys(cleanedMediaOptions).length > 0) media.options = cleanedMediaOptions;
    const hasMedia = Object.keys(media).length > 0;

    const base = {
      module,
      dimension: dimension.trim(),
      questionText: questionText.trim(),
      options: trimmedOptions,
      source: source.trim(),
      license: license.trim() || undefined,
      version: Number(version) || 1,
      poolGroup: poolGroup.trim() || undefined,
      media: hasMedia ? media : undefined,
    };

    const payload = isAptitude
      ? { ...base, correctOptionId: correctOptionId.trim() }
      : { ...base, scoringMap: buildScoringMap(trimmedOptions, dimension.trim()) };

    const url = editing ? `/api/admin/question-bank/${item!.id}` : "/api/admin/question-bank";
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      return;
    }

    toast.success(editing ? "Item updated" : "Item created");
    setOpen(false);
    start(() => router.refresh());
  }

  const filledOptionIds = options.filter((o) => o.id.trim() !== "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* In controlled mode the parent owns the trigger (and lazy-mounts this
          form), so we omit the built-in DialogTrigger entirely. */}
      {isControlled ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus data-icon="inline-start" />
              New item
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit item" : "New item"}</DialogTitle>
          <DialogDescription>
            {isAptitude
              ? "Aptitude items mark exactly one correct option."
              : "Self-report items build a 1–5 Likert scoring map from the dimension and option order."}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="gap-6 py-4">
          <Field orientation="responsive">
            <FieldContent>
              <FieldLabel htmlFor="qbf-module">Module</FieldLabel>
              <Select
                value={module}
                onValueChange={(v) => onModuleChange(v as ModuleValue)}
                disabled={editing}
              >
                <SelectTrigger id="qbf-module">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="interests">Interests</SelectItem>
                    <SelectItem value="work_style">Work style</SelectItem>
                    <SelectItem value="aptitude">Aptitude</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {editing ? (
                <FieldDescription>Module is fixed after creation.</FieldDescription>
              ) : null}
            </FieldContent>
            <FieldContent>
              <FieldLabel htmlFor="qbf-dimension">Dimension</FieldLabel>
              <Input
                id="qbf-dimension"
                value={dimension}
                onChange={(e) => setDimension(e.target.value)}
                placeholder={isAptitude ? "e.g. numerical" : "e.g. R"}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="qbf-question">Question text</FieldLabel>
            <Textarea
              id="qbf-question"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={2}
            />
          </Field>

          <FieldSet>
            <div className="flex items-center justify-between">
              <FieldLegend variant="label">Options</FieldLegend>
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                <Plus data-icon="inline-start" />
                Add option
              </Button>
            </div>
            <FieldDescription>
              {isAptitude
                ? "Provide an id and label for each choice, then mark the correct one below."
                : "Each option maps to its rank (1–5) on the dimension, in the order listed."}
            </FieldDescription>
            <div className="flex flex-col gap-2">
              {options.map((o, i) => {
                const isCorrect =
                  isAptitude && o.id.trim() !== "" && o.id.trim() === correctOptionId.trim();
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md border bg-card p-2"
                    data-correct={isCorrect}
                  >
                    <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <Input
                      aria-label={`Option ${i + 1} id`}
                      value={o.id}
                      onChange={(e) => setOption(i, { id: e.target.value })}
                      placeholder="id"
                      className="w-20 shrink-0"
                    />
                    <Input
                      aria-label={`Option ${i + 1} text`}
                      value={o.text}
                      onChange={(e) => setOption(i, { text: e.target.value })}
                      placeholder="Option label"
                      className="flex-1"
                    />
                    {isAptitude ? (
                      <Button
                        type="button"
                        variant={isCorrect ? "default" : "ghost"}
                        size="icon"
                        disabled={o.id.trim() === ""}
                        onClick={() => setCorrectOptionId(o.id.trim())}
                        aria-label={isCorrect ? "Correct answer" : `Mark option ${i + 1} correct`}
                        aria-pressed={isCorrect}
                      >
                        <CircleDot />
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="shrink-0 tabular-nums">
                        {i + 1}
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(i)}
                      aria-label={`Remove option ${i + 1}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
            </div>
            {isAptitude ? (
              <FieldDescription>
                {correctOptionId.trim()
                  ? `Correct option: ${correctOptionId.trim()}`
                  : "No correct option selected yet — use the target button on a row."}
              </FieldDescription>
            ) : null}
          </FieldSet>

          <FieldSeparator />

          <Field orientation="responsive">
            <FieldContent>
              <FieldLabel htmlFor="qbf-source">Source</FieldLabel>
              <Input id="qbf-source" value={source} onChange={(e) => setSource(e.target.value)} />
            </FieldContent>
            <FieldContent>
              <FieldLabel htmlFor="qbf-version">Version</FieldLabel>
              <Input
                id="qbf-version"
                type="number"
                min={1}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </FieldContent>
            <FieldContent>
              <FieldLabel htmlFor="qbf-pool">Pool group</FieldLabel>
              <Input
                id="qbf-pool"
                value={poolGroup}
                onChange={(e) => setPoolGroup(e.target.value)}
                placeholder="optional"
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="qbf-license">License</FieldLabel>
            <Input
              id="qbf-license"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              placeholder="optional"
            />
          </Field>

          <FieldSet className="rounded-md border p-3">
            <FieldLegend variant="label">Figural media</FieldLegend>
            <FieldDescription>
              Optional image prompts for figural items — a stem image and/or per-option images.
            </FieldDescription>
            <Field>
              <FieldLabel htmlFor="qbf-media-stem">Stem image URL</FieldLabel>
              <Input
                id="qbf-media-stem"
                value={mediaStem}
                onChange={(e) => setMediaStem(e.target.value)}
                placeholder="optional — figural prompt image URL"
              />
            </Field>
            {filledOptionIds.length > 0 ? (
              <Field>
                <FieldLabel>Per-option image URLs</FieldLabel>
                <div className="flex flex-col gap-2">
                  {filledOptionIds.map((o) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <Badge variant="outline" className="w-10 shrink-0 justify-center font-mono">
                        {o.id}
                      </Badge>
                      <Input
                        aria-label={`Image URL for option ${o.id}`}
                        value={mediaOptions[o.id] ?? ""}
                        onChange={(e) =>
                          setMediaOptions((prev) => ({ ...prev, [o.id]: e.target.value }))
                        }
                        placeholder="optional image URL"
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </Field>
            ) : null}
          </FieldSet>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {editing ? "Save changes" : "Create item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
