create table if not exists public.trainers (
  id text primary key,
  first_name text not null default '',
  last_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_assignments (
  id text primary key,
  trainer_id text references public.trainers(id) on delete set null,
  trainer_name text not null default '',
  date date not null,
  time text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.smart_start_assignments (
  id text primary key,
  trainer_id text references public.trainers(id) on delete set null,
  trainer_name text not null default '',
  date date not null,
  time text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.intro_training_assignments (
  id text primary key,
  trainer_id text references public.trainers(id) on delete set null,
  trainer_name text not null default '',
  date date not null,
  time text not null,
  created_at timestamptz not null default now()
);

alter table public.trainers enable row level security;
alter table public.schedule_assignments enable row level security;
alter table public.smart_start_assignments enable row level security;
alter table public.intro_training_assignments enable row level security;

drop policy if exists "Authenticated read trainers" on public.trainers;
create policy "Authenticated read trainers"
  on public.trainers
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated write trainers" on public.trainers;
create policy "Authenticated write trainers"
  on public.trainers
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated update trainers" on public.trainers;
create policy "Authenticated update trainers"
  on public.trainers
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated delete trainers" on public.trainers;
create policy "Authenticated delete trainers"
  on public.trainers
  for delete
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated read schedule assignments" on public.schedule_assignments;
create policy "Authenticated read schedule assignments"
  on public.schedule_assignments
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated write schedule assignments" on public.schedule_assignments;
create policy "Authenticated write schedule assignments"
  on public.schedule_assignments
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated update schedule assignments" on public.schedule_assignments;
create policy "Authenticated update schedule assignments"
  on public.schedule_assignments
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated delete schedule assignments" on public.schedule_assignments;
create policy "Authenticated delete schedule assignments"
  on public.schedule_assignments
  for delete
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated read smart start assignments" on public.smart_start_assignments;
create policy "Authenticated read smart start assignments"
  on public.smart_start_assignments
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated write smart start assignments" on public.smart_start_assignments;
create policy "Authenticated write smart start assignments"
  on public.smart_start_assignments
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated update smart start assignments" on public.smart_start_assignments;
create policy "Authenticated update smart start assignments"
  on public.smart_start_assignments
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated delete smart start assignments" on public.smart_start_assignments;
create policy "Authenticated delete smart start assignments"
  on public.smart_start_assignments
  for delete
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated read intro training assignments" on public.intro_training_assignments;
create policy "Authenticated read intro training assignments"
  on public.intro_training_assignments
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated write intro training assignments" on public.intro_training_assignments;
create policy "Authenticated write intro training assignments"
  on public.intro_training_assignments
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated update intro training assignments" on public.intro_training_assignments;
create policy "Authenticated update intro training assignments"
  on public.intro_training_assignments
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated delete intro training assignments" on public.intro_training_assignments;
create policy "Authenticated delete intro training assignments"
  on public.intro_training_assignments
  for delete
  using (auth.role() = 'authenticated');

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trainers'
  ) then
    alter publication supabase_realtime add table public.trainers;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'schedule_assignments'
  ) then
    alter publication supabase_realtime add table public.schedule_assignments;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'smart_start_assignments'
  ) then
    alter publication supabase_realtime add table public.smart_start_assignments;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'intro_training_assignments'
  ) then
    alter publication supabase_realtime add table public.intro_training_assignments;
  end if;
end $$;
