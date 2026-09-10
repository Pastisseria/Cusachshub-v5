-- Ejecutar una sola vez en Supabase > SQL Editor.
create table if not exists public.higiene_ibertrac_documentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('parte', 'producto', 'ficha_tecnica', 'ficha_seguridad', 'registro_sanitario', 'etiquetaje_producto')),
  fecha_documento date not null default current_date,
  titulo text not null,
  numero_documento text,
  producto text,
  numero_registro text,
  zona_aplicacion text,
  observaciones text,
  productos_detectados jsonb not null default '[]'::jsonb,
  archivo_nombre text not null,
  archivo_ruta text not null,
  archivo_tipo text,
  created_at timestamptz not null default now()
);
alter table public.higiene_ibertrac_documentos
  add column if not exists productos_detectados jsonb not null default '[]'::jsonb;
alter table public.higiene_ibertrac_documentos
  drop constraint if exists higiene_ibertrac_documentos_tipo_check;
alter table public.higiene_ibertrac_documentos
  add constraint higiene_ibertrac_documentos_tipo_check
  check (tipo in ('parte', 'producto', 'ficha_tecnica', 'ficha_seguridad', 'registro_sanitario', 'etiquetaje_producto'));
create index if not exists higiene_ibertrac_fecha_idx on public.higiene_ibertrac_documentos (fecha_documento desc);
alter table public.higiene_ibertrac_documentos enable row level security;
drop policy if exists "ibertrac_administrador" on public.higiene_ibertrac_documentos;
create policy "ibertrac_administrador"
  on public.higiene_ibertrac_documentos for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

create table if not exists public.higiene_ibertrac_exclusiones (
  id uuid primary key default gen_random_uuid(),
  producto_clave text not null unique,
  producto_nombre text not null,
  motivo text,
  created_at timestamptz not null default now()
);
alter table public.higiene_ibertrac_exclusiones enable row level security;
drop policy if exists "ibertrac_exclusiones_administrador" on public.higiene_ibertrac_exclusiones;
create policy "ibertrac_exclusiones_administrador"
  on public.higiene_ibertrac_exclusiones for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());
grant select, insert, update, delete on public.higiene_ibertrac_exclusiones to authenticated;
