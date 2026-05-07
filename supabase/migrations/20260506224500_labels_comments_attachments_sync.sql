alter table public.labels
  add column if not exists local_id text;

alter table public.comments
  add column if not exists local_id text;

alter table public.attachments
  add column if not exists local_id text;

create unique index if not exists labels_local_id_key
  on public.labels(local_id);

create unique index if not exists comments_local_id_key
  on public.comments(local_id);

create unique index if not exists attachments_local_id_key
  on public.attachments(local_id);

drop policy if exists "admin can manage labels" on public.labels;
drop policy if exists "admin can manage card labels" on public.card_labels;
drop policy if exists "admin can manage comments" on public.comments;
drop policy if exists "admin can manage attachments" on public.attachments;
drop policy if exists "workspace members can read card labels" on public.card_labels;
drop policy if exists "workspace members can read attachments" on public.attachments;

create policy "admin can manage labels"
on public.labels
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admin can manage card labels"
on public.card_labels
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admin can manage comments"
on public.comments
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admin can manage attachments"
on public.attachments
for all
using (public.is_admin())
with check (public.is_admin());

create policy "workspace members can read card labels"
on public.card_labels
for select
using (
  exists (
    select 1
    from public.cards
    join public.workspace_access access on access.workspace_id = cards.workspace_id
    where cards.id = card_labels.card_id
      and access.profile_id = auth.uid()
  )
);

create policy "workspace members can read attachments"
on public.attachments
for select
using (
  exists (
    select 1
    from public.workspace_access access
    where access.workspace_id = attachments.workspace_id
      and access.profile_id = auth.uid()
  )
);
