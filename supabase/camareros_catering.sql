alter table public.caterings
  add column if not exists camareros_necesarios integer,
  add column if not exists camareros_confirmados integer not null default 0,
  add column if not exists camareros_asignados text,
  add column if not exists hora_camareros_inicio time,
  add column if not exists hora_camareros_fin time,
  add column if not exists notas_camareros text;

alter table public.caterings drop constraint if exists caterings_camareros_necesarios_check;
alter table public.caterings add constraint caterings_camareros_necesarios_check check (camareros_necesarios is null or camareros_necesarios >= 0);
alter table public.caterings drop constraint if exists caterings_camareros_confirmados_check;
alter table public.caterings add constraint caterings_camareros_confirmados_check check (camareros_confirmados >= 0);
