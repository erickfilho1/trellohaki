create or replace function public.upsert_workspace_from_invite(
  p_local_id text,
  p_title text,
  p_client_name text,
  p_description text,
  p_accent text,
  p_share_link text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  next_workspace_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Somente administradores podem sincronizar quadros para convites.';
  end if;

  insert into public.workspaces (
    local_id,
    title,
    client_name,
    description,
    accent,
    share_link,
    updated_at
  )
  values (
    nullif(trim(p_local_id), ''),
    coalesce(nullif(trim(p_title), ''), 'Quadro sem nome'),
    coalesce(nullif(trim(p_client_name), ''), 'Cliente'),
    coalesce(trim(p_description), ''),
    coalesce(trim(p_accent), ''),
    coalesce(trim(p_share_link), ''),
    now()
  )
  on conflict (local_id) do update
  set
    title = excluded.title,
    client_name = excluded.client_name,
    description = excluded.description,
    accent = excluded.accent,
    share_link = excluded.share_link,
    updated_at = now()
  returning id into next_workspace_id;

  return next_workspace_id;
end;
$$;
