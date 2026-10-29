-- Ejecutar en Supabase SQL Editor antes de usar el importador.
create table if not exists public.menaje_importaciones (
 id uuid primary key default gen_random_uuid(),
 clave text not null unique,
 documento text not null,
 estado text not null default 'procesando',
 created_at timestamptz not null default now()
);
create table if not exists public.menaje_entradas (
 id uuid primary key default gen_random_uuid(),
 importacion_id uuid not null references public.menaje_importaciones(id),
 linea integer not null,
 menaje_id uuid not null references public.menaje(id),
 cantidad integer not null check (cantidad > 0),
 precio numeric,
 created_at timestamptz not null default now(),
 unique(importacion_id,linea)
);
alter table public.menaje_importaciones enable row level security;
alter table public.menaje_entradas enable row level security;
-- No se crean políticas públicas. Adaptar políticas a los roles existentes.
create or replace function public.registrar_entrada_menaje(
 p_importacion_id uuid,p_linea integer,p_menaje_id uuid,p_nombre text,p_cantidad integer,p_precio numeric
) returns void language plpgsql security invoker set search_path = public as $$
declare v_id uuid; v_estado text;
begin
 if p_cantidad is null or p_cantidad <= 0 or p_nombre is null or trim(p_nombre) = '' then raise exception 'Línea inválida'; end if;
 select estado into v_estado from public.menaje_importaciones where id=p_importacion_id for update;
 if v_estado is distinct from 'procesando' then raise exception 'Importación no disponible'; end if;
 if exists(select 1 from public.menaje_entradas where importacion_id=p_importacion_id and linea=p_linea) then raise exception 'Línea ya registrada'; end if;
 if p_menaje_id is null then
   insert into public.menaje(nombre,tipo,stock_total,stock_reservado,stock_minimo,precio_coste,precio_alquiler,activo)
   values(trim(p_nombre),'reutilizable',0,0,0,coalesce(p_precio,0),0,true) returning id into v_id;
 else v_id:=p_menaje_id; end if;
 update public.menaje set stock_total=coalesce(stock_total,0)+p_cantidad,
 precio_coste=coalesce(p_precio,precio_coste),updated_at=now() where id=v_id;
 if not found then raise exception 'Artículo no encontrado'; end if;
 insert into public.menaje_entradas(importacion_id,linea,menaje_id,cantidad,precio)
 values(p_importacion_id,p_linea,v_id,p_cantidad,p_precio);
end $$;
revoke all on function public.registrar_entrada_menaje(uuid,integer,uuid,text,integer,numeric) from public;
grant execute on function public.registrar_entrada_menaje(uuid,integer,uuid,text,integer,numeric) to authenticated;
