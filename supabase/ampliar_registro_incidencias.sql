alter table public.higiene_incidencias add column if not exists hora_incidencia time;
alter table public.higiene_incidencias add column if not exists firma_incidencia text;
alter table public.higiene_incidencias add column if not exists fecha_correccion date;
alter table public.higiene_incidencias add column if not exists hora_correccion time;
alter table public.higiene_incidencias add column if not exists firma_correccion text;
alter table public.higiene_incidencias add column if not exists hay_albaran boolean not null default false;
alter table public.higiene_incidencias add column if not exists numero_albaran text;
