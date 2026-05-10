drop policy if exists "profiles self or admin read" on public.profiles;
drop policy if exists "members can read workspace access" on public.workspace_access;

create policy "profiles workspace member read"
on public.profiles
for select
using (
  auth.uid() = id
  or public.is_admin()
  or exists (
    select 1
    from public.workspace_access viewer_access
    join public.workspace_access target_access
      on target_access.workspace_id = viewer_access.workspace_id
    where viewer_access.profile_id = auth.uid()
      and target_access.profile_id = profiles.id
  )
);

create policy "workspace members can read workspace access"
on public.workspace_access
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.workspace_access viewer_access
    where viewer_access.workspace_id = workspace_access.workspace_id
      and viewer_access.profile_id = auth.uid()
  )
);
