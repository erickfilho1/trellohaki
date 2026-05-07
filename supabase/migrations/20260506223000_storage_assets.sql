insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'flowboard-assets',
  'flowboard-assets',
  true,
  10485760,
  array[
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
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated can read flowboard assets" on storage.objects;
drop policy if exists "authenticated can upload flowboard assets" on storage.objects;
drop policy if exists "authenticated can update flowboard assets" on storage.objects;
drop policy if exists "authenticated can delete flowboard assets" on storage.objects;

create policy "authenticated can read flowboard assets"
on storage.objects
for select
using (
  bucket_id = 'flowboard-assets'
  and auth.role() = 'authenticated'
);

create policy "authenticated can upload flowboard assets"
on storage.objects
for insert
with check (
  bucket_id = 'flowboard-assets'
  and auth.role() = 'authenticated'
);

create policy "authenticated can update flowboard assets"
on storage.objects
for update
using (
  bucket_id = 'flowboard-assets'
  and auth.role() = 'authenticated'
)
with check (
  bucket_id = 'flowboard-assets'
  and auth.role() = 'authenticated'
);

create policy "authenticated can delete flowboard assets"
on storage.objects
for delete
using (
  bucket_id = 'flowboard-assets'
  and auth.role() = 'authenticated'
);
