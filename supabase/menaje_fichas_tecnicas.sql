alter table public.menaje
  add column if not exists ficha_tecnica_nombre text,
  add column if not exists ficha_tecnica_ruta text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menaje-fichas',
  'menaje-fichas',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Menaje fichas lectura" on storage.objects;
create policy "Menaje fichas lectura"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'menaje-fichas');

drop policy if exists "Menaje fichas subida" on storage.objects;
create policy "Menaje fichas subida"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'menaje-fichas');

drop policy if exists "Menaje fichas modificacion" on storage.objects;
create policy "Menaje fichas modificacion"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'menaje-fichas')
  with check (bucket_id = 'menaje-fichas');

drop policy if exists "Menaje fichas eliminacion" on storage.objects;
create policy "Menaje fichas eliminacion"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'menaje-fichas');
