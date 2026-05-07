drop index if exists public.workspaces_local_id_key;
drop index if exists public.lists_local_id_key;
drop index if exists public.cards_local_id_key;
drop index if exists public.delivered_folders_local_id_key;

create unique index if not exists workspaces_local_id_key
  on public.workspaces(local_id);

create unique index if not exists lists_local_id_key
  on public.lists(local_id);

create unique index if not exists cards_local_id_key
  on public.cards(local_id);

create unique index if not exists delivered_folders_local_id_key
  on public.delivered_folders(local_id);
