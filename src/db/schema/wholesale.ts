import { pgSchema, text, timestamp, uuid, decimal, integer, boolean, serial } from "drizzle-orm/pg-core";
import { shops } from "./admin";

export const wholesaleSchema = pgSchema("wholesale");

export const products = wholesaleSchema.table("products", {
    id: uuid("id").primaryKey().defaultRandom(),
    shop_id: uuid("shop_id").references(() => shops.id, { onDelete: 'cascade' }).notNull(),
    name: text("name").notNull(),
    name_mr: text("name_mr"),
    stock: integer("stock").default(0).notNull(),
    barcode: text("barcode"),
    buy_rate: decimal("buy_rate", { precision: 10, scale: 2 }),
    sell_rate: decimal("sell_rate", { precision: 10, scale: 2 }).notNull(),
    wholesale_rate: decimal("wholesale_rate", { precision: 10, scale: 2 }).notNull(),
    min_stock: integer("min_stock").default(5),
    created_at: timestamp("created_at").defaultNow().notNull(),
});

export const customers = wholesaleSchema.table("customers", {
    id: uuid("id").primaryKey().defaultRandom(),
    shop_id: uuid("shop_id").references(() => shops.id, { onDelete: 'cascade' }).notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    old_balance: decimal("old_balance", { precision: 12, scale: 2 }).default("0").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
});

export const customerPayments = wholesaleSchema.table("customer_payments", {
    id: uuid("id").primaryKey().defaultRandom(),
    shop_id: uuid("shop_id").references(() => shops.id, { onDelete: 'cascade' }).notNull(),
    customer_id: uuid("customer_id").references(() => customers.id, { onDelete: 'cascade' }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
});

export const invoices = wholesaleSchema.table("invoices", {
    id: uuid("id").primaryKey().defaultRandom(),
    invoice_no: integer("invoice_no").default(0).notNull(),
    shop_id: uuid("shop_id").references(() => shops.id, { onDelete: 'cascade' }).notNull(),
    customer_id: uuid("customer_id").references(() => customers.id),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
    total_amount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 12, scale: 2 }).default("0").notNull(),
    total_cogs: decimal("total_cogs", { precision: 12, scale: 2 }).default("0").notNull(),
    amount_paid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0").notNull(),
    payment_method: text("payment_method").default("CASH").notNull(),
    is_archived: boolean("is_archived").default(false).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
});

export const invoiceItems = wholesaleSchema.table("invoice_items", {
    id: uuid("id").primaryKey().defaultRandom(),
    invoice_id: uuid("invoice_id").references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
    product_id: uuid("product_id").references(() => products.id).notNull(),
    quantity: integer("quantity").notNull(),
    rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
});

export const suppliers = wholesaleSchema.table("suppliers", {
    id: uuid("id").primaryKey().defaultRandom(),
    shop_id: uuid("shop_id").references(() => shops.id, { onDelete: 'cascade' }).notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    current_balance: decimal("current_balance", { precision: 12, scale: 2 }).default("0").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
});

export const supplierPayments = wholesaleSchema.table("supplier_payments", {
    id: uuid("id").primaryKey().defaultRandom(),
    shop_id: uuid("shop_id").references(() => shops.id, { onDelete: 'cascade' }).notNull(),
    supplier_id: uuid("supplier_id").references(() => suppliers.id, { onDelete: 'cascade' }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseBills = wholesaleSchema.table("purchase_bills", {
    id: uuid("id").primaryKey().defaultRandom(),
    purchase_no: integer("purchase_no").default(0).notNull(),
    shop_id: uuid("shop_id").references(() => shops.id, { onDelete: 'cascade' }).notNull(),
    supplier_id: uuid("supplier_id").references(() => suppliers.id).notNull(),
    total_amount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    amount_paid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0").notNull(),
    payment_method: text("payment_method").default("CASH").notNull(),
    is_archived: boolean("is_archived").default(false).notNull(),
    bill_date: timestamp("bill_date").defaultNow().notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseItems = wholesaleSchema.table("purchase_items", {
    id: uuid("id").primaryKey().defaultRandom(),
    purchase_bill_id: uuid("purchase_bill_id").references(() => purchaseBills.id, { onDelete: 'cascade' }).notNull(),
    product_id: uuid("product_id").references(() => products.id).notNull(),
    quantity: integer("quantity").notNull(),
    buy_rate: decimal("buy_rate", { precision: 10, scale: 2 }).notNull(),
    sell_rate: decimal("sell_rate", { precision: 10, scale: 2 }).notNull(),
    total_amount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
});
