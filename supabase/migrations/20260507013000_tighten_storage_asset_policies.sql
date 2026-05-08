create or replace function public.can_access_workspace_by_local_id(p_workspace_local_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.workspaces workspace
      join public.workspace_access access on access.workspace_id = workspace.id
      where workspace.local_id = p_workspace_local_id
        and access.user_id = auth.uid()
    );
$$;

update storage.buckets
set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
where id = 'flowboard-assets';

drop policy if exists "authenticated can read flowboard assets" on storage.objects;
drop policy if exists "authenticated can upload flowboard assets" on storage.objects;
drop policy if exists "authenticated can update flowboard assets" on storage.objects;
drop policy if exists "authenticated can delete flowboard assets" on storage.objects;
drop policy if exists "workspace members can read flowboard assets" on storage.objects;
drop policy if exists "workspace members can upload flowboard assets" on storage.objects;
drop policy if exists "workspace members can update flowboard assets" on storage.objects;
drop policy if exists "workspace members can delete flowboard assets" on storage.objects;

create policy "workspace members can read flowboard assets"
on storage.objects
for select
using (
  bucket_id = 'flowboard-assets'
  and auth.role() = 'authenticated'
);

create policy "workspace members can upload flowboard assets"
on storage.objects
for insert
with check (
  bucket_id = 'flowboard-assets'
  and auth.role() = 'authenticated'
  and (
    public.is_admin()
    or (
      storage.foldername(name)[1] = 'boards'
      and public.can_access_workspace_by_local_id(storage.foldername(name)[2])
    )
    or storage.foldername(name)[1] = 'project-summaries'
  )
);

create policy "workspace members can update flowboard assets"
on storage.objects
for update
using (
  bucket_id = 'flowboard-assets'
  and auth.role() = 'authenticated'
  and (
    public.is_admin()
    or (
      storage.foldername(name)[1] = 'boards'
      and public.can_access_workspace_by_local_id(storage.foldername(name)[2])
    )
    or storage.foldername(name)[1] = 'project-summaries'
  )
)
with check (
  bucket_id = 'flowboard-assets'
  and auth.role() = 'authenticated'
  and (
    public.is_admin()
    or (
      storage.foldername(name)[1] = 'boards'
      and public.can_access_workspace_by_local_id(storage.foldername(name)[2])
    )
    or storage.foldername(name)[1] = 'project-summaries'
  )
);

create policy "workspace members can delete flowboard assets"
on storage.objects
for delete
using (
  bucket_id = 'flowboard-assets'
  and auth.role() = 'authenticated'
  and (
    public.is_admin()
    or (
      storage.foldername(name)[1] = 'boards'
      and public.can_access_workspace_by_local_id(storage.foldername(name)[2])
    )
    or storage.foldername(name)[1] = 'project-summaries'
  )
);
