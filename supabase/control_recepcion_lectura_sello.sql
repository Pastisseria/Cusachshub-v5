alter table public.higiene_control_recepcion
  add column if not exists sello_detectado boolean not null default false,
  add column if not exists lectura_automatica jsonb not null default '{}'::jsonb;
