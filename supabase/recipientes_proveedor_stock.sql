alter table public.compras_recipientes add column menaje_id bigint references public.menaje(id);
alter table public.menaje add column proveedor_id uuid references public.proveedores(id);
create index compras_recipientes_menaje_idx on public.compras_recipientes(menaje_id);
