import { pgTable, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const shops = pgTable("shops", {
    id: uuid("id").primaryKey().defaultRandom(),
    tenant_code: text("tenant_code"),
    owner_id: uuid("owner_id").notNull(),
    name: text("name").notNull(),
    name_mr: text("name_mr"),
    phone: text("phone"),
    address: text("address"),
    address_mr: text("address_mr"),
    category_id: text("category_id").default("wholesale").notNull(),
    owner_pin: text("owner_pin").default("1234").notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    subscription_price: integer("subscription_price").default(999).notNull(),
    subscription_status: text("subscription_status").default("active").notNull(),
    subscription_end_date: timestamp("subscription_end_date").default(sql`CURRENT_TIMESTAMP + interval '30 days'`).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
});
