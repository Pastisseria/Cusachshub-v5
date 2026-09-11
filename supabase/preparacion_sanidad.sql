-- Cuestionarios de autocontrol de la Guía de prácticas correctas de higiene
create table if not exists public.higiene_cuestionarios (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('requisitos', 'trimestral')),
  periodo text not null,
  codigo text not null,
  seccion text not null,
  pregunta text not null,
  respuesta text not null default 'Pendiente' check (respuesta in ('Pendiente', 'Sí', 'No', 'No aplica')),
  nota text,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid default auth.uid(),
  unique (tipo, periodo, codigo)
);

create index if not exists higiene_cuestionarios_periodo_idx
  on public.higiene_cuestionarios (tipo, periodo, codigo);

alter table public.higiene_cuestionarios enable row level security;
drop policy if exists "cuestionarios_higiene_administrador" on public.higiene_cuestionarios;
create policy "cuestionarios_higiene_administrador"
  on public.higiene_cuestionarios for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

grant select, insert, update, delete on public.higiene_cuestionarios to authenticated;

create table if not exists public.higiene_gestion_sanidad (
  id uuid primary key default gen_random_uuid(), apartado text not null, titulo text not null,
  estado text not null default 'Pendiente' check (estado in ('Pendiente', 'En preparación', 'Preparado', 'Revisar')),
  responsable text, fecha_objetivo date, notas text, archivo_nombre text, archivo_ruta text,
  created_at timestamptz not null default now(), creado_por uuid default auth.uid()
);
create index if not exists higiene_gestion_sanidad_apartado_idx on public.higiene_gestion_sanidad (apartado, created_at desc);
alter table public.higiene_gestion_sanidad enable row level security;
drop policy if exists "gestion_sanidad_administrador" on public.higiene_gestion_sanidad;
create policy "gestion_sanidad_administrador" on public.higiene_gestion_sanidad for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());
grant select, insert, update, delete on public.higiene_gestion_sanidad to authenticated;
