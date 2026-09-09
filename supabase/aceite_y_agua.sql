create table if not exists public.higiene_aceite_recogidas (
  id uuid primary key default gen_random_uuid(), fecha_recogida date not null,
  gestor text not null, numero_documento text not null, numero_factura text,
  cantidad_kg numeric(10,2), importe numeric(10,2), codigo_residuo text default '20 01 25',
  observaciones text, archivo_nombre text not null, archivo_ruta text not null,
  created_at timestamptz default now()
);
create table if not exists public.higiene_facturas_agua (
  id uuid primary key default gen_random_uuid(), proveedor text not null,
  numero_factura text not null, fecha_factura date not null, periodo_desde date,
  periodo_hasta date, consumo_m3 numeric(12,3), importe_total numeric(12,2),
  observaciones text, archivo_nombre text not null, archivo_ruta text not null,
  created_at timestamptz default now()
);
alter table public.higiene_aceite_recogidas enable row level security;
alter table public.higiene_facturas_agua enable row level security;
drop policy if exists "Aceite autenticados" on public.higiene_aceite_recogidas;
create policy "Aceite autenticados" on public.higiene_aceite_recogidas for all to authenticated using (true) with check (true);
drop policy if exists "Agua autenticados" on public.higiene_facturas_agua;
create policy "Agua autenticados" on public.higiene_facturas_agua for all to authenticated using (true) with check (true);
insert into storage.buckets (id, name, public) values ('higiene-pdfs', 'higiene-pdfs', false) on conflict (id) do nothing;
drop policy if exists "PDF higiene autenticados" on storage.objects;
create policy "PDF higiene autenticados" on storage.objects for all to authenticated using (bucket_id = 'higiene-pdfs') with check (bucket_id = 'higiene-pdfs');
