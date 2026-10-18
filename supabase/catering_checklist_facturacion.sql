-- Ejecutar una vez antes de publicar el checklist de Catering.
-- Conserva todos los datos y las políticas de acceso existentes de caterings.
-- NULL significa que todavía no se ha confirmado manualmente.
ALTER TABLE public.caterings
  ADD COLUMN IF NOT EXISTS control_envio_facturar_at timestamptz,
  ADD COLUMN IF NOT EXISTS control_facturado_at timestamptz;
COMMENT ON COLUMN public.caterings.control_envio_facturar_at IS 'Fecha de revisión manual: se ha comprobado el envío a facturar.';
COMMENT ON COLUMN public.caterings.control_facturado_at IS 'Fecha de revisión manual: se ha comprobado que el catering está facturado. Independiente de las marcas previas del presupuesto.';
