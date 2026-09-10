-- Cusachs Hub · Personal y prevención de riesgos laborales
-- Los datos personales del Excel se importan directamente en Supabase y no se
-- incluyen en este repositorio público.

create table if not exists public.personal_trabajadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellidos text not null default '',
  dni text,
  telefono text,
  email text,
  fecha_nacimiento date,
  activo boolean not null default true,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists personal_trabajadores_dni_unico
  on public.personal_trabajadores (upper(dni)) where dni is not null and trim(dni) <> '';

create table if not exists public.personal_documentos_prl (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references public.personal_trabajadores(id) on delete cascade,
  tipo text not null check (tipo in (
    'formacion_puesto', 'epis', 'renuncia_reconocimiento',
    'manipulador_alimentos', 'reconocimiento_medico', 'otra_formacion', 'otro'
  )),
  titulo text not null,
  entidad_formadora text,
  fecha_emision date,
  fecha_caducidad date,
  numero_certificado text,
  observaciones text,
  archivo_nombre text,
  archivo_ruta text,
  archivo_tipo text,
  created_at timestamptz not null default now()
);

create index if not exists personal_documentos_trabajador_idx
  on public.personal_documentos_prl (trabajador_id, fecha_emision desc);
create index if not exists personal_documentos_caducidad_idx
  on public.personal_documentos_prl (fecha_caducidad) where fecha_caducidad is not null;

alter table public.personal_trabajadores enable row level security;
alter table public.personal_documentos_prl enable row level security;

drop policy if exists "personal_trabajadores_administrador" on public.personal_trabajadores;
create policy "personal_trabajadores_administrador"
  on public.personal_trabajadores for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

drop policy if exists "personal_documentos_administrador" on public.personal_documentos_prl;
create policy "personal_documentos_administrador"
  on public.personal_documentos_prl for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

grant select, insert, update, delete on public.personal_trabajadores to authenticated;
grant select, insert, update, delete on public.personal_documentos_prl to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'personal-prl', 'personal-prl', false, 15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "personal_prl_leer" on storage.objects;
create policy "personal_prl_leer" on storage.objects for select to authenticated
  using (bucket_id = 'personal-prl' and public.es_administrador());
drop policy if exists "personal_prl_subir" on storage.objects;
create policy "personal_prl_subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'personal-prl' and public.es_administrador());
drop policy if exists "personal_prl_actualizar" on storage.objects;
create policy "personal_prl_actualizar" on storage.objects for update to authenticated
  using (bucket_id = 'personal-prl' and public.es_administrador())
  with check (bucket_id = 'personal-prl' and public.es_administrador());
drop policy if exists "personal_prl_eliminar" on storage.objects;
create policy "personal_prl_eliminar" on storage.objects for delete to authenticated
  using (bucket_id = 'personal-prl' and public.es_administrador());
