alter table public.lists
  add column if not exists local_id text;

alter table public.cards
  add column if not exists local_id text;

alter table public.delivered_folders
  add column if not exists local_id text;

create unique index if not exists lists_local_id_key
  on public.lists(local_id)
  where local_id is not null;

create unique index if not exists cards_local_id_key
  on public.cards(local_id)
  where local_id is not null;

create unique index if not exists delivered_folders_local_id_key
  on public.delivered_folders(local_id)
  where local_id is not null;

drop policy if exists "admin can manage lists" on public.lists;
drop policy if exists "admin can manage cards" on public.cards;
drop policy if exists "admin can manage delivered folders" on public.delivered_folders;

create policy "admin can manage lists"
on public.lists
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admin can manage cards"
on public.cards
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admin can manage delivered folders"
on public.delivered_folders
for all
using (public.is_admin())
with check (public.is_admin());
