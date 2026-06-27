import "./load-env";
import { Pool } from "pg";
import { env } from "../lib/env";
import { createPoolConfig } from "../lib/db/pool-config";

const sql = String.raw`
alter table public.account enable row level security;
alter table public.assessments enable row level security;
alter table public.audit_log enable row level security;
alter table public.career_clusters enable row level security;
alter table public.course_institutes enable row level security;
alter table public.course_learning_resources enable row level security;
alter table public.courses enable row level security;
alter table public.institutes enable row level security;
alter table public.question_bank enable row level security;
alter table public.rate_limit enable row level security;
alter table public.session enable row level security;
alter table public."user" enable row level security;
alter table public.verification enable row level security;

drop policy if exists "public_read_active_career_clusters" on public.career_clusters;
create policy "public_read_active_career_clusters"
  on public.career_clusters
  for select
  to anon, authenticated
  using (active = true);

drop policy if exists "public_read_published_courses" on public.courses;
create policy "public_read_published_courses"
  on public.courses
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "public_read_published_institutes" on public.institutes;
create policy "public_read_published_institutes"
  on public.institutes
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "public_read_published_course_institutes" on public.course_institutes;
create policy "public_read_published_course_institutes"
  on public.course_institutes
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_id and c.status = 'published'
    )
    and exists (
      select 1 from public.institutes i
      where i.id = institute_id and i.status = 'published'
    )
  );

drop policy if exists "public_read_published_course_learning_resources" on public.course_learning_resources;
create policy "public_read_published_course_learning_resources"
  on public.course_learning_resources
  for select
  to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.status = 'published'
    )
  );

revoke all on
  public.account,
  public.assessments,
  public.audit_log,
  public.career_clusters,
  public.course_institutes,
  public.course_learning_resources,
  public.courses,
  public.institutes,
  public.question_bank,
  public.rate_limit,
  public.session,
  public."user",
  public.verification
from public;

revoke all on
  public.account,
  public.assessments,
  public.audit_log,
  public.question_bank,
  public.rate_limit,
  public.session,
  public."user",
  public.verification
from anon, authenticated;

revoke insert, update, delete on
  public.career_clusters,
  public.courses,
  public.institutes,
  public.course_institutes,
  public.course_learning_resources
from anon, authenticated, public;

grant usage on schema public to anon, authenticated;
grant select on
  public.career_clusters,
  public.courses,
  public.institutes,
  public.course_institutes,
  public.course_learning_resources
to anon, authenticated;
`;

async function main() {
  const pool = new Pool(createPoolConfig(env.DATABASE_URL, 1));
  try {
    await pool.query(sql);
  } finally {
    await pool.end();
  }
  console.log("RLS enabled and Supabase grants tightened");
}

main().catch((err) => {
  console.error("Failed to apply Supabase RLS:", err);
  process.exit(1);
});
