create extension if not exists pgcrypto;

create table if not exists public.app_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

create index if not exists app_data_user_key_idx on public.app_data(user_id, key);

alter table public.app_data enable row level security;

create policy "Users can read own app data"
on public.app_data
for select
using (auth.uid() = user_id);

create policy "Users can insert own app data"
on public.app_data
for insert
with check (auth.uid() = user_id);

create policy "Users can update own app data"
on public.app_data
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own app data"
on public.app_data
for delete
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_data_set_updated_at on public.app_data;
create trigger app_data_set_updated_at
before update on public.app_data
for each row
execute function public.set_updated_at();

-- Optional: if you want to test the DB from SQL editor, run:
-- insert into public.app_data(user_id, key, value)
-- values (auth.uid(), 'demo', '{"ok": true}');
