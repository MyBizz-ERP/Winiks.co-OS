-- ==========================================
-- STAGE 2: THE MASTER PUBLIC SCHEMA
-- Execute this entirely inside your Supabase SQL Editor
-- ==========================================

-- 1. CATEGORIES TABLE (The "ERP Types" available to clients)
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,          -- 'wholesale', 'salon', 'medical'
    display_name VARCHAR(255) NOT NULL,        -- 'Wholesale ERP', 'Salon Manager'
    health_status VARCHAR(50) DEFAULT 'GREEN', -- 'GREEN', 'YELLOW', 'RED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SHOPS TABLE (The "Cities/Clients" you onboard)
CREATE TABLE public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
    shop_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    owner_email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,            -- Toggle client access immediately 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SYSTEM LOGS TABLE (Health Tracking across all Shops)
CREATE TABLE public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    severity VARCHAR(50) NOT NULL,             -- 'INFO', 'WARNING', 'ERROR'
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. INSERT DEFAULT ERP CATEGORIES
-- ==========================================
INSERT INTO public.categories (name, display_name) VALUES 
('wholesale', 'Wholesale ERP'),
('salon', 'Salon & Spa ERP');
