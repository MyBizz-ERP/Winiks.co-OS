import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { shops } from './src/db/schema/admin';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function seedShop() {
    console.log("INJECTING TENANT PROVISION...");

    // 1. Get the admin user we created
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error || !users || users.length === 0) {
        console.error("No users found in Supabase Auth.");
        process.exit(1);
    }

    // Find Gourav or winiks
    const user = users.find(u => u.email?.includes('gourav') || u.email?.includes('winiks')) || users[0];
    console.log(`Binding tenant shop to UID: ${user.id} (${user.email})`);

    // 2. Insert into Drizzle DB
    try {
        await db.insert(shops).values({
            owner_id: user.id,
            name: "Premium Terminal OS",
            phone: "9999999999",
            address: "Silicon Valley Workspace",
            category_id: "wholesale",
        });
        console.log("SUCCESS! The Tenant Security Bridge has been mathematically satisfied.");
    } catch (e: any) {
        if (e.message.includes('duplicate key')) {
            console.log("Shop already exists for this Owner. Safe to proceed.");
        } else {
            console.error("DB Error:", e);
        }
    }
    process.exit(0);
}

seedShop();
