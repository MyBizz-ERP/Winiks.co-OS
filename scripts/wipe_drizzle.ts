import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { shops } from '../src/db/schema/admin';

async function wipe() {
    console.log("Dropping rows for Clean Slate Protocol...");
    await db.execute(sql`TRUNCATE public.shops CASCADE;`);
    console.log("Wipe complete.");
    process.exit(0);
}

wipe();
