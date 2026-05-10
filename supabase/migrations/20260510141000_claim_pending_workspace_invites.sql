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

  with pending_invites as (
    select invite.id, invite.workspace_id, invite.board_role, invite.panel, invite.kind
    from public.workspace_invites invite
    where lower(invite.email) = current_email
      and invite.status = 'pendente'
  ), claimed_access as (
    insert into public.workspace_access (
      workspace_id,
      profile_id,
      board_role,
      panel
    )
    select
      pending.workspace_id,
      current_user_id,
      pending.board_role,
      pending.panel
    from pending_invites pending
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
