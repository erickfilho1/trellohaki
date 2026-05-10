create or replace function public.get_registration_invite(
  p_email text,
  p_workspace_local_id text default null
)
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
    and invite.status in ('pendente', 'aceito')
    and (
      nullif(trim(coalesce(p_workspace_local_id, '')), '') is null
      or workspace.local_id = nullif(trim(coalesce(p_workspace_local_id, '')), '')
    )
  order by
    case when invite.status = 'pendente' then 0 else 1 end,
    invite.updated_at desc,
    invite.created_at desc
  limit 1;
$$;

create or replace function public.claim_pending_workspace_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  claimed_count integer := 0;
  latest_kind text;
begin
  if current_user_id is null then
    raise exception 'Sessao ausente.';
  end if;

  select lower(email)
  into current_email
  from auth.users
  where id = current_user_id;

  if current_email is null or current_email = '' then
    raise exception 'Email autenticado ausente.';
  end if;

  with relevant_invites as (
    select invite.id, invite.workspace_id, invite.board_role, invite.panel, invite.kind, invite.status
    from public.workspace_invites invite
    where lower(invite.email) = current_email
      and invite.status in ('pendente', 'aceito')
  ), claimed_access as (
    insert into public.workspace_access (
      workspace_id,
      profile_id,
      board_role,
      panel
    )
    select
      invite.workspace_id,
      current_user_id,
      invite.board_role,
      invite.panel
    from relevant_invites invite
    on conflict (workspace_id, profile_id) do update
    set
      board_role = excluded.board_role,
      panel = excluded.panel,
      updated_at = now()
    returning workspace_id
  )
  select count(*)
  into claimed_count
  from claimed_access;

  update public.workspace_invites
  set
    status = 'aceito',
    updated_at = now()
  where lower(email) = current_email
    and status = 'pendente';

  select invite.kind
  into latest_kind
  from public.workspace_invites invite
  where lower(invite.email) = current_email
    and invite.status in ('pendente', 'aceito')
  order by invite.updated_at desc, invite.created_at desc
  limit 1;

  update public.profiles
  set
    kind = coalesce(latest_kind, kind),
    status = 'ativo',
    updated_at = now()
  where id = current_user_id;

  return claimed_count;
end;
$$;
