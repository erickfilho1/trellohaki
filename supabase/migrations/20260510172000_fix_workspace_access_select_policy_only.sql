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

drop policy if exists "workspace members can read workspace access" on public.workspace_access;
drop policy if exists "members can read workspace access" on public.workspace_access;

create policy "workspace members can read workspace access"
on public.workspace_access
for select
using (public.can_read_workspace_access(workspace_id));
