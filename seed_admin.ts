import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedAdmin() {
    console.log("INJECTING GOD-MODE CREDENTIALS...");

    const { data, error } = await supabase.auth.admin.createUser({
        email: 'winiks.co@gmail.com',
        password: 'Winiks2026!$',
        email_confirm: true,
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log("Account already exists. Safe to proceed.");
        } else {
            console.error("FAILED TO INJECT:", error.message);
        }
    } else {
        console.log("SUCCESS! Account created: winiks.co@gmail.com / Winiks2026!$");
    }
}

seedAdmin();
