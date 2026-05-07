create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  kind text not null check (kind in ('admin', 'cliente', 'colaborador')),
  status text not null default 'pendente' check (status in ('ativo', 'pendente', 'desativado')),
  company text,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_name text not null,
  description text,
  accent text,
  share_link text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_access (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  board_role text not null check (board_role in ('Membro', 'Observador', 'Administrador')),
  panel text not null check (panel in ('admin', 'cliente', 'colaborador')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, profile_id)
);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  kind text not null check (kind in ('cliente', 'colaborador')),
  board_role text not null check (board_role in ('Membro', 'Observador', 'Administrador')),
  panel text not null check (panel in ('cliente', 'colaborador')),
  token text not null unique,
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  color text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  list_id uuid not null references public.lists(id) on delete cascade,
  delivered_folder_id uuid,
  title text not null,
  description text,
  cover jsonb,
  project_summary jsonb,
  custom_fields jsonb not null default '[]'::jsonb,
  dates jsonb not null default '{}'::jsonb,
  completed boolean not null default false,
  archived boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivered_folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cards
  drop constraint if exists cards_delivered_folder_id_fkey;

alter table public.cards
  add constraint cards_delivered_folder_id_fkey
  foreign key (delivered_folder_id) references public.delivered_folders(id) on delete set null;

create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.card_labels (
  card_id uuid not null references public.cards(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (card_id, label_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  name text not null,
  url text not null,
  kind text not null check (kind in ('link', 'file')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_access enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.lists enable row level security;
alter table public.cards enable row level security;
alter table public.delivered_folders enable row level security;
alter table public.labels enable row level security;
alter table public.card_labels enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;

create policy "profiles self or admin read"
on public.profiles
for select
using (
  auth.uid() = id
  or exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.kind = 'admin'
  )
);

create policy "workspace members can read workspaces"
on public.workspaces
for select
using (
  exists (
    select 1
    from public.workspace_access access
    where access.workspace_id = workspaces.id
      and access.profile_id = auth.uid()
  )
);

create policy "workspace members can read lists"
on public.lists
for select
using (
  exists (
    select 1
    from public.workspace_access access
    where access.workspace_id = lists.workspace_id
      and access.profile_id = auth.uid()
  )
);

create policy "workspace members can read cards"
on public.cards
for select
using (
  exists (
    select 1
    from public.workspace_access access
    where access.workspace_id = cards.workspace_id
      and access.profile_id = auth.uid()
  )
);

create policy "workspace members can read folders"
on public.delivered_folders
for select
using (
  exists (
    select 1
    from public.workspace_access access
    where access.workspace_id = delivered_folders.workspace_id
      and access.profile_id = auth.uid()
  )
);

create policy "workspace members can read labels"
on public.labels
for select
using (
  exists (
    select 1
    from public.workspace_access access
    where access.workspace_id = labels.workspace_id
      and access.profile_id = auth.uid()
  )
);

create policy "workspace members can read comments"
on public.comments
for select
using (
  exists (
    select 1
    from public.workspace_access access
    where access.workspace_id = comments.workspace_id
      and access.profile_id = auth.uid()
  )
);

