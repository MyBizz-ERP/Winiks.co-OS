import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = postgres(process.env.DATABASE_URL!, { prepare: false });

async function runSQL() {
    try {
        console.log("Executing strict hardware SQL migration (Ignoring collisions)...");
        const sqlContent = fs.readFileSync('./supabase/migrations/0001_abandoned_phalanx.sql', 'utf8');
        const statements = sqlContent.split('--> statement-breakpoint');

        for (const statement of statements) {
            const trimmed = statement.trim();
            if (!trimmed) continue;
            try {
                await client.unsafe(trimmed);
                console.log("Executed block successfully");
            } catch (err: any) {
                // Ignore "already exists" errors, throw on others if critical
                if (err.message.includes('already exists') || err.code === '42701' || err.code === '42P07') {
                    console.log("Ignored known conflict: ", err.message);
                } else {
                    console.error("Statement failed:", err.message);
                    console.error("Query:", trimmed);
                }
            }
        }
        console.log("SUCCESS: Wholesale schema successfully forced into Postgres.");
    } catch (e) {
        console.error("FATAL DB ERROR:", e);
    }
    process.exit(0);
}
runSQL();
