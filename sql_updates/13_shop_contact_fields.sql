-- =========================================================================
-- DATABASE PATCH: Add WhatsApp and GMB Review Link to public.shops
-- =========================================================================

ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS google_review_link TEXT;
