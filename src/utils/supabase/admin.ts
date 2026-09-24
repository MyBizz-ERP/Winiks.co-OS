import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// NOTE: This client automatically bypasses ALL Row Level Security (RLS) locks.
// NEVER expose this client to the browser/client-side! 
// Strictly use this inside Server Actions and Server Components (like Admin Dashboards).
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})
