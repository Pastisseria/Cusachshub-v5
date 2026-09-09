create table if not exists public.higiene_productos_limpieza (
  id uuid primary key default gen_random_uuid(), nombre text not null, marca text,
  proveedor text, uso text not null, dilucion text, peligros text,
  fecha_revision date, observaciones text, archivo_nombre text,
  archivo_ruta text, created_at timestamptz default now()
);
alter table public.higiene_productos_limpieza enable row level security;
drop policy if exists "Usuarios autenticados" on public.higiene_productos_limpieza;
create policy "Usuarios autenticados" on public.higiene_productos_limpieza
for all to authenticated using (true) with check (true);
