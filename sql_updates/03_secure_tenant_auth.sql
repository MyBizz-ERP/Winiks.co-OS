ALTER TABLE public.shops ADD COLUMN owner_id UUID REFERENCES auth.users(id);
