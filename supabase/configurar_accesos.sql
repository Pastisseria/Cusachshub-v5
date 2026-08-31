-- CUSACHS HUB · Acceso único con dos perfiles
-- Ejecutar una sola vez desde Supabase > SQL Editor.

create table if not exists public.perfiles_usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  rol text not null default 'catering' check (rol in ('administrador', 'catering')),
  creado_en timestamptz not null default now()
);

alter table public.perfiles_usuario enable row level security;

create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.perfiles_usuario
    where id = auth.uid() and rol = 'administrador'
  );
$$;

revoke all on function public.es_administrador() from public;
grant execute on function public.es_administrador() to authenticated;

create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles_usuario (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    'catering'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute procedure public.crear_perfil_usuario();

-- Crea perfiles para usuarios que ya existieran antes de ejecutar este archivo.
insert into public.perfiles_usuario (id, nombre, rol)
select id, coalesce(raw_user_meta_data ->> 'nombre', split_part(email, '@', 1)), 'catering'
from auth.users
on conflict (id) do nothing;

drop policy if exists "ver_perfil_propio" on public.perfiles_usuario;
create policy "ver_perfil_propio"
on public.perfiles_usuario for select
to authenticated
using (id = auth.uid() or public.es_administrador());

drop policy if exists "administrar_perfiles" on public.perfiles_usuario;
create policy "administrar_perfiles"
on public.perfiles_usuario for all
to authenticated
using (public.es_administrador())
with check (public.es_administrador());

-- Protege las tablas actuales. El administrador mantiene acceso completo.
do $$
declare tabla record;
begin
  for tabla in
    select tablename
    from pg_tables
    where schemaname = 'public' and tablename <> 'perfiles_usuario'
  loop
    execute format('alter table public.%I enable row level security', tabla.tablename);
    execute format('drop policy if exists "administrador_total" on public.%I', tabla.tablename);
    execute format(
      'create policy "administrador_total" on public.%I for all to authenticated using (public.es_administrador()) with check (public.es_administrador())',
      tabla.tablename
    );
  end loop;
end $$;

-- Datos que pueden utilizar las cuentas de Catering.
do $$
declare nombre_tabla text;
begin
  foreach nombre_tabla in array array[
    'clientes', 'productos', 'presupuestos', 'presupuesto_lineas',
    'presupuestos_estandar', 'caterings', 'menaje', 'bebidas', 'producciones'
  ]
  loop
    if to_regclass('public.' || nombre_tabla) is not null then
      execute format('drop policy if exists "catering_total" on public.%I', nombre_tabla);
      execute format(
        'create policy "catering_total" on public.%I for all to authenticated using ((select rol from public.perfiles_usuario where id = auth.uid()) = ''catering'') with check ((select rol from public.perfiles_usuario where id = auth.uid()) = ''catering'')',
        nombre_tabla
      );
    end if;
  end loop;
end $$;

-- PASO FINAL: después de crear tu usuario en Authentication > Users,
-- sustituye el correo y ejecuta únicamente estas tres líneas:
-- update public.perfiles_usuario
-- set rol = 'administrador'
-- where id = (select id from auth.users where email = 'TU_CORREO@EJEMPLO.COM');
