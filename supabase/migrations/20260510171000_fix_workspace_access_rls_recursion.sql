create or replace function public.can_read_workspace_access(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.workspace_access access
      where access.workspace_id = p_workspace_id
        and access.profile_id = auth.uid()
    );
$$;

create or replace function public.can_read_profile_directory(p_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() = p_profile_id
    or public.is_admin()
    or exists (
      select 1
      from public.workspace_access viewer_access
      join public.workspace_access target_access
        on target_access.workspace_id = viewer_access.workspace_id
      where viewer_access.profile_id = auth.uid()
        and target_access.profile_id = p_profile_id
    );
$$;

drop policy if exists "profiles workspace member read" on public.profiles;
create policy "profiles workspace member read"
on public.profiles
for select
using (public.can_read_profile_directory(id));

drop policy if exists "workspace members can read workspace access" on public.workspace_access;
drop policy if exists "members can read workspace access" on public.workspace_access;
create policy "workspace members can read workspace access"
on public.workspace_access
for select
using (public.can_read_workspace_access(workspace_id));
