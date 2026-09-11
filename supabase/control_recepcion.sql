create table if not exists public.higiene_control_recepcion (
  id uuid primary key default gen_random_uuid(),
  fecha_recepcion date not null default current_date,
  hora_recepcion time,
  proveedor text,
  responsable_recepcion text,
  temperatura numeric,
  estado_revision text not null default 'pendiente' check (estado_revision in ('pendiente', 'conforme', 'incidencia')),
  controles jsonb not null default '{}'::jsonb,
  observaciones text,
  nombre_original text not null,
  archivo_nombre text not null,
  archivo_ruta text not null,
  archivo_sellado_nombre text,
  archivo_sellado_ruta text,
  posicion_sello text not null default 'abajo_izquierda' check (posicion_sello in ('abajo_izquierda', 'abajo_derecha', 'arriba_izquierda', 'arriba_derecha')),
  revisado_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists higiene_control_recepcion_fecha_idx on public.higiene_control_recepcion (fecha_recepcion desc);
alter table public.higiene_control_recepcion enable row level security;
drop policy if exists "control_recepcion_administrador" on public.higiene_control_recepcion;
create policy "control_recepcion_administrador" on public.higiene_control_recepcion
  for all to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());
grant select, insert, update, delete on public.higiene_control_recepcion to authenticated;
