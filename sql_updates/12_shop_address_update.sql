-- =========================================================================
-- DATABASE PATCH: Add Address field to public.shops for Receipt Engine
-- =========================================================================

ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS address TEXT;
