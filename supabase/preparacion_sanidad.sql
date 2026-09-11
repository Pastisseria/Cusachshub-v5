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
