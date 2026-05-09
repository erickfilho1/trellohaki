alter table public.profiles
  add column if not exists avatar_url text;

drop policy if exists "profiles self update" on public.profiles;

create policy "profiles self update"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
