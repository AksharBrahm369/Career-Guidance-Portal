import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <PageHeader
      eyebrow="Admin workspace"
      title={title}
      description={description}
      actions={actions}
    />
  );
}
