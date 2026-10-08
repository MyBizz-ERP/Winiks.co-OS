
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { shops } from './src/db/schema';
const client = postgres('postgresql://postgres:%40Winiks.co2004@db.uuenecbtwzohibezgfrv.supabase.co:5432/postgres');
const db = drizzle(client);

async function run() {
    const allShops = await db.select({ owner_pin: shops.owner_pin, name: shops.name }).from(shops);
    console.log(allShops);
    process.exit(0);
}
run();

