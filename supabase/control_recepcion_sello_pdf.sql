alter table public.higiene_control_recepcion
  add column if not exists responsable_recepcion text,
  add column if not exists archivo_sellado_nombre text,
  add column if not exists archivo_sellado_ruta text,
  add column if not exists posicion_sello text not null default 'abajo_izquierda';

alter table public.higiene_control_recepcion
  drop constraint if exists higiene_control_recepcion_posicion_sello_check;

alter table public.higiene_control_recepcion
  add constraint higiene_control_recepcion_posicion_sello_check
  check (posicion_sello in ('abajo_izquierda', 'abajo_derecha', 'arriba_izquierda', 'arriba_derecha'));
