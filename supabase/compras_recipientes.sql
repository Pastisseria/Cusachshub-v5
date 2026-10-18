create table public.compras_recipientes (
  producto_clave text primary key,
  recipiente text not null check (length(trim(recipiente)) > 0),
  unidades_por_recipiente numeric not null check (unidades_por_recipiente > 0),
  activo boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.compras_recipientes enable row level security;
grant select, insert, update on public.compras_recipientes to authenticated;
create policy recipientes_lectura on public.compras_recipientes for select to authenticated using (true);
create policy recipientes_insertar on public.compras_recipientes for insert to authenticated with check (public.es_administrador());
create policy recipientes_actualizar on public.compras_recipientes for update to authenticated using (public.es_administrador()) with check (public.es_administrador());
