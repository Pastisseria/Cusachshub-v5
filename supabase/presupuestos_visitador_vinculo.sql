-- Ejecutar una vez en el editor SQL del proyecto Supabase de Cusachs Hub.
-- No cambia permisos, políticas ni importes. Conserva los vínculos existentes.
begin;

do $$
declare tipo_id text;
begin
  select format_type(atttypid, atttypmod) into strict tipo_id
  from pg_attribute
  where attrelid = 'public.visitadores_medicos'::regclass
    and attname = 'id' and not attisdropped;
  execute format('alter table public.presupuestos add column if not exists visitador_id %s', tipo_id);
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.presupuestos'::regclass
      and conname = 'presupuestos_visitador_id_fkey'
  ) then
    alter table public.presupuestos
      add constraint presupuestos_visitador_id_fkey
      foreign key (visitador_id) references public.visitadores_medicos(id);
  end if;
end $$;

create index if not exists presupuestos_visitador_id_idx
  on public.presupuestos (visitador_id);

-- Un nombre antiguo solo se asigna si identifica a una única persona.
-- Se comparan nombre y nombre completo juntos para detectar homónimos.
with alias_visitadores as (
  select distinct id, lower(regexp_replace(btrim(alias), '\s+', ' ', 'g')) as nombre
  from public.visitadores_medicos
  cross join lateral (values (nombre), (concat_ws(' ', nombre, apellidos))) as nombres(alias)
  where nullif(btrim(alias), '') is not null
), candidatos as (
  select p.id as presupuesto_id, v.id as visitador_id,
    count(*) over (partition by p.id) as coincidencias
  from public.presupuestos p
  join alias_visitadores v
    on v.nombre = lower(regexp_replace(btrim(p.visitador_nombre), '\s+', ' ', 'g'))
  where p.visitador_id is null and p.tipo_documento = 'Visitador médico'
)
update public.presupuestos p set visitador_id = c.visitador_id
from candidatos c
where p.id = c.presupuesto_id and c.coincidencias = 1 and p.visitador_id is null;

notify pgrst, 'reload schema';
commit;

-- Verificación: consultar los vínculos y los casos que necesitan selección manual.
select p.id, p.numero, p.visitador_nombre, p.visitador_id,
  concat_ws(' ', v.nombre, v.apellidos) as visitador_vinculado
from public.presupuestos p
left join public.visitadores_medicos v on v.id = p.visitador_id
where p.tipo_documento = 'Visitador médico'
order by p.created_at desc;
