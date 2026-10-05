import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { shops } from './src/db/schema/admin';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function setRootAdmin() {
    const email = "admin@winiks.com";
    const password = "Password@123";

    console.log(`Creating/Verifying Absolute Master Admin: ${email}`);

    // Create user in Auth
    let { data: { user }, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log("User exists. Forcing password reset to guarantee access.");
            await supabase.auth.admin.updateUserById(
                (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email)!.id,
                { password: password }
            );
            user = (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email)!;
        } else {
            console.error("Auth Error:", error);
            process.exit(1);
        }
    }

    console.log("Injecting Tenant matrix lock...");
    try {
        await db.insert(shops).values({
            owner_id: user!.id,
            name: "Winiks Global HQ",
            phone: "9999999999",
            address: "Silicon Valley Workspace",
            category_id: "wholesale",
        });
        console.log("Tenant Successfully Injected!");
    } catch (e: any) {
        if (e.message.includes('duplicate key')) {
            console.log("Shop already exists for this OS instance.");
        }
    }

    console.log("DONE. Login is active.");
    process.exit(0);
}

setRootAdmin();
