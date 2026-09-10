-- Permite indicar quién realiza el transporte de cada catering.
alter table public.caterings
  add column if not exists transporte_tipo text;

alter table public.caterings
  drop constraint if exists caterings_transporte_tipo_check;

alter table public.caterings
  add constraint caterings_transporte_tipo_check
  check (transporte_tipo is null or transporte_tipo in ('Taxi', 'Interno'));
