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
  auth_user_id uuid;
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
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
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

  select id
  into auth_user_id
  from auth.users
  where lower(email) = normalized_email
  limit 1;

  if auth_user_id is null then
    update public.profiles
    set
      kind = p_kind,
      status = 'pendente',
      updated_at = now()
    where lower(email) = normalized_email;

    return invite_record;
  end if;

  select *
  into profile_record
  from public.profiles
  where id = auth_user_id
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
