-- Idempotent hardening for projects that already applied 0001_init.
-- Wraps auth.uid() in a subquery (initplan), scopes policies to authenticated,
-- and grants Data API access without exposing the table to anon.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'analysis_runs_user_id_fkey'
  ) then
    alter table analysis_runs
      add constraint analysis_runs_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
end $$;

create index if not exists analysis_runs_user_created_at_idx
  on analysis_runs (user_id, created_at desc);

alter table analysis_runs enable row level security;
alter table analysis_runs force row level security;

revoke all on table analysis_runs from anon;
grant select, insert on table analysis_runs to authenticated;

drop policy if exists own_rows_only_select on analysis_runs;
create policy own_rows_only_select on analysis_runs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists own_rows_only_insert on analysis_runs;
create policy own_rows_only_insert on analysis_runs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
