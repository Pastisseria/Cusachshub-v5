ALTER TABLE public.higiene_control_recepcion
  ADD COLUMN IF NOT EXISTS compra_albaran jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS higiene_recepcion_compra_unica
  ON public.higiene_control_recepcion (
    proveedor_id,
    (left(compra_albaran->>'fecha', 4)),
    (regexp_replace(lower(compra_albaran->>'numero'), '[^[:alnum:]]', '', 'g'))
  )
  WHERE compra_albaran->>'validado' = 'true';
