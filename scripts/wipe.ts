import 'dotenv/config';
import postgres from 'postgres';

async function wipe() {
    const sql = postgres(process.env.DATABASE_URL as string, { ssl: 'require' });
    console.log("Dropping table public.shops for Clean Slate Protocol...");
    await sql`TRUNCATE public.shops CASCADE;`
    console.log("Wipe complete.");
    process.exit(0);
}

wipe();
