create table if not exists analysis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz not null default now(),
  clos_text text not null,
  exam_text text not null,
  past_exams_text text not null default '',
  result jsonb not null
);

alter table analysis_runs enable row level security;

drop policy if exists own_rows_only_select on analysis_runs;
create policy own_rows_only_select on analysis_runs
  for select using (auth.uid() = user_id);

drop policy if exists own_rows_only_insert on analysis_runs;
create policy own_rows_only_insert on analysis_runs
  for insert with check (auth.uid() = user_id);
