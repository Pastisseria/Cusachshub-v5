-- Amplía las recetas con los datos de la ficha de producción.
alter table public.recipes
  add column if not exists production_sheet jsonb not null default '{}'::jsonb;

