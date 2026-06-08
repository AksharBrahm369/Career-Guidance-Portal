"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";

export function QbFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  function push(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "" || value === ALL) sp.delete(key);
      else sp.set(key, value);
    }
    // a filter change resets paging back to the first page
    sp.delete("page");
    start(() => router.push(`?${sp.toString()}`));
  }

  function clearSearch() {
    setQ("");
    push({ q: null });
  }

  return (
    <FieldGroup className="gap-3 rounded-md border bg-card p-3 @container/qb-filters">
      <Field orientation="responsive" className="items-end">
        <FieldContent className="@md/qb-filters:max-w-44">
          <FieldLabel htmlFor="qb-active">Status</FieldLabel>
          <Select
            value={params.get("active") ?? ALL}
            onValueChange={(v) => push({ active: v })}
          >
            <SelectTrigger id="qb-active">
              <SelectValue placeholder="Any status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL}>Any status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </FieldContent>

        <FieldContent>
          <FieldLabel htmlFor="qb-search">Search</FieldLabel>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              push({ q });
            }}
          >
            <InputGroup>
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                id="qb-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search question text and press Enter…"
              />
              {q ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Clear search"
                    onClick={clearSearch}
                  >
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
          </form>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}
