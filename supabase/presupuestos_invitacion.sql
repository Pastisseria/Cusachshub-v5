ALTER TABLE public.presupuestos
  ADD COLUMN IF NOT EXISTS invitacion boolean NOT NULL DEFAULT false;
