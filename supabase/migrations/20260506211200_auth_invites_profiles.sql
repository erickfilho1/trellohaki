alter table public.workspaces
  add column if not exists local_id text;

create unique index if not exists workspaces_local_id_key
  on public.workspaces(local_id)
  where local_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspace_invites_workspace_email_key'
  ) then
    alter table public.workspace_invites
      add constraint workspace_invites_workspace_email_key unique(workspace_id, email);
  end if;
end $$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and kind = 'admin'
      and status = 'ativo'
  );
$$;

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  invite_record public.workspace_invites%rowtype;
  profile_kind text;
  profile_name text;
begin
  normalized_email := lower(coalesce(new.email, ''));
  profile_name := nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), '');

  select *
  into invite_record
  from public.workspace_invites
  where lower(email) = normalized_email
    and status = 'pendente'
  order by created_at desc
  limit 1;

  if normalized_email = 'erickfilho281@gmail.com' then
    profile_kind := 'admin';
  elsif invite_record.id is not null then
    profile_kind := invite_record.kind;
  else
    profile_kind := coalesce(new.raw_user_meta_data->>'kind', 'cliente');
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    kind,
    status,
    company,
    title
  )
  values (
    new.id,
    normalized_email,
    coalesce(profile_name, split_part(normalized_email, '@', 1)),
    profile_kind,
    case when normalized_email = 'erickfilho281@gmail.com' or invite_record.id is not null then 'ativo' else 'pendente' end,
    null,
    case
      when profile_kind = 'admin' then 'Administrador principal'
      when profile_kind = 'colaborador' then 'Colaborador convidado'
      else 'Cliente convidado'
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    kind = excluded.kind,
    status = excluded.status,
    title = excluded.title,
    updated_at = now();

  if invite_record.id is not null then
    insert into public.workspace_access (
      workspace_id,
      profile_id,
      board_role,
      panel
    )
    values (
      invite_record.workspace_id,
      new.id,
      invite_record.board_role,
      invite_record.panel
    )
    on conflict (workspace_id, profile_id) do update
    set
      board_role = excluded.board_role,
      panel = excluded.panel,
      updated_at = now();

    update public.workspace_invites
    set status = 'aceito', updated_at = now()
    where id = invite_record.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_clientboard on auth.users;

create trigger on_auth_user_created_clientboard
after insert on auth.users
for each row execute function public.handle_auth_user_created();

create or replace function public.get_registration_invite(p_email text)
returns table (
  email text,
  kind text,
  panel text,
  board_role text,
  workspace_id uuid,
  workspace_local_id text,
  workspace_title text
)
language sql
security definer
set search_path = public
as $$
  select
    lower(invite.email) as email,
    invite.kind,
    invite.panel,
    invite.board_role,
    workspace.id as workspace_id,
    workspace.local_id as workspace_local_id,
    workspace.title as workspace_title
  from public.workspace_invites invite
  join public.workspaces workspace on workspace.id = invite.workspace_id
  where lower(invite.email) = lower(trim(p_email))
    and invite.status = 'pendente'
  order by invite.created_at desc
  limit 1;
$$;

create or replace function public.prepare_workspace_invite(
  p_workspace_id uuid,
  p_email text,
  p_kind text
)
returns public.workspace_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  next_role text;
  next_panel text;
  invite_record public.workspace_invites%rowtype;
  profile_record public.profiles%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Somente administradores podem preparar convites.';
  end if;

  normalized_email := lower(trim(p_email));

  if normalized_email = '' or normalized_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'Email invalido.';
  end if;

  if p_kind not in ('cliente', 'colaborador') then
    raise exception 'Tipo de acesso invalido.';
  end if;

  next_role := case when p_kind = 'cliente' then 'Observador' else 'Membro' end;
  next_panel := p_kind;

  insert into public.workspace_invites (
    workspace_id,
    email,
    kind,
    board_role,
    panel,
    token,
    status
  )
  values (
    p_workspace_id,
    normalized_email,
    p_kind,
    next_role,
    next_panel,
    encode(gen_random_bytes(18), 'hex'),
    'pendente'
  )
  on conflict (workspace_id, email) do update
  set
    kind = excluded.kind,
    board_role = excluded.board_role,
    panel = excluded.panel,
    status = 'pendente',
    token = excluded.token,
    updated_at = now()
  returning * into invite_record;

  select *
  into profile_record
  from public.profiles
  where lower(email) = normalized_email
  limit 1;

  if profile_record.id is not null then
    update public.profiles
    set
      kind = p_kind,
      status = 'ativo',
      updated_at = now()
    where id = profile_record.id;

    insert into public.workspace_access (
      workspace_id,
      profile_id,
      board_role,
      panel
    )
    values (
      p_workspace_id,
      profile_record.id,
      next_role,
      next_panel
    )
    on conflict (workspace_id, profile_id) do update
    set
      board_role = excluded.board_role,
      panel = excluded.panel,
      updated_at = now();
  end if;

  return invite_record;
end;
$$;

drop policy if exists "profiles self or admin read" on public.profiles;
drop policy if exists "profiles admin update" on public.profiles;
drop policy if exists "admin can manage workspaces" on public.workspaces;
drop policy if exists "admin can manage workspace access" on public.workspace_access;
drop policy if exists "members can read workspace access" on public.workspace_access;
drop policy if exists "admin can manage invites" on public.workspace_invites;

create policy "profiles self or admin read"
on public.profiles
for select
using (auth.uid() = id or public.is_admin());

create policy "profiles admin update"
on public.profiles
for update
using (public.is_admin())
with check (public.is_admin());

create policy "admin can manage workspaces"
on public.workspaces
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admin can manage workspace access"
on public.workspace_access
for all
using (public.is_admin())
with check (public.is_admin());

create policy "members can read workspace access"
on public.workspace_access
for select
using (profile_id = auth.uid() or public.is_admin());

create policy "admin can manage invites"
on public.workspace_invites
for all
using (public.is_admin())
with check (public.is_admin());
