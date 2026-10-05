import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client);

async function run() {
    try {
        console.log("Running Raw Query...");
        const res = await client`SELECT * FROM "wholesale"."products" LIMIT 1`;
        console.log("SUCCESS:", res);
    } catch (e) {
        console.error("CRITICAL DB ERROR:", e);
    }
    process.exit(0);
}
run();
