alter table public.higiene_control_recepcion
  add column if not exists proveedor_id uuid references public.proveedores(id) on delete set null;

create index if not exists higiene_control_recepcion_proveedor_idx
  on public.higiene_control_recepcion (proveedor_id);

update public.higiene_control_recepcion control
set proveedor_id = proveedor.id,
    proveedor = proveedor.nombre
from public.proveedores proveedor
where control.proveedor_id is null
  and control.proveedor is not null
  and lower(proveedor.nombre) like '%' || lower(control.proveedor) || '%';
