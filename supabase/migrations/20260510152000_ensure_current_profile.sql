create or replace function public.ensure_current_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  auth_email text;
  auth_name text;
  latest_invite public.workspace_invites%rowtype;
  next_kind text;
  next_status text;
  next_title text;
  profile_record public.profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'Sessao ausente.';
  end if;

  select
    lower(email),
    nullif(trim(coalesce(raw_user_meta_data->>'name', '')), '')
  into auth_email, auth_name
  from auth.users
  where id = current_user_id;

  if auth_email is null or auth_email = '' then
    raise exception 'Email autenticado ausente.';
  end if;

  select *
  into latest_invite
  from public.workspace_invites invite
  where lower(invite.email) = auth_email
  order by invite.updated_at desc, invite.created_at desc
  limit 1;

  if auth_email = 'erickfilho281@gmail.com' then
    next_kind := 'admin';
    next_status := 'ativo';
  elsif latest_invite.id is not null then
    next_kind := latest_invite.kind;
    next_status := 'ativo';
  else
    select coalesce(nullif(trim(coalesce(raw_user_meta_data->>'kind', '')), ''), 'cliente')
    into next_kind
    from auth.users
    where id = current_user_id;
    next_status := 'pendente';
  end if;

  next_title := case
    when next_kind = 'admin' then 'Administrador principal'
    when next_kind = 'colaborador' then 'Colaborador convidado'
    else 'Cliente convidado'
  end;

  insert into public.profiles (
    id,
    email,
    full_name,
    kind,
    status,
    title
  )
  values (
    current_user_id,
    auth_email,
    coalesce(auth_name, split_part(auth_email, '@', 1)),
    next_kind,
    next_status,
    next_title
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    kind = excluded.kind,
    status = case
      when excluded.status = 'ativo' then 'ativo'
      else public.profiles.status
    end,
    title = coalesce(public.profiles.title, excluded.title),
    updated_at = now()
  returning * into profile_record;

  return profile_record;
end;
$$;
