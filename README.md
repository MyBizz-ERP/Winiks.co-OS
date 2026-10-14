# WINIKS Co-OS - Wholesale ERP Platform

Winiks Co-OS is a modern, ultra-fast, multi-tenant Wholesale & Retail ERP built for high-throughput merchants, distributors, and shopkeepers.

---

## Key Modules

- **POS Checkout (`/erp/wholesale/pos`):** High-speed cash & credit sales billing powered by local client memory (IndexedDB) for zero-latency barcode scanning and offline resilience.
- **Kharedi Inward Purchases (`/erp/wholesale/purchase`):** Inward purchase logging with supplier ledger updates, batch buying rates, and instant stock inventory repletion.
- **Kharedi Purchase History (`/erp/wholesale/purchase/history`):** Complete audit log of inward supplier bills with single-bill A4 PDF vouchers, multi-bill A4 register downloads, voiding, and re-cloning.
- **Accounts Payable / AP (`/erp/wholesale/ap`):** Comprehensive supplier liability ledger tracking pending dues, payments made, and vendor contact matrices.
- **Udhaari Ledger (`/erp/wholesale/udhaari`):** Customer credit management with WhatsApp payment reminder dispatches and cash recovery tracing.
- **Day-End Vault (`/erp/wholesale/vault`):** Cryptographically protected gross profit auditor deriving true accrual margins from COGS vs Revenue, persistent Market Udhaari, and Vendor Dues.
- **Master Settings & Period Reset (`/erp/wholesale/settings`):** Owner PIN protected configurations, CSV ledger restoration, and a 3-part gated period reset mechanism.

---

## Engineering & Product Changelog

For a detailed record of updates, implementation dates, and the **business rationale** behind every architectural decision, see:
- [Development Log](file:///d:/WINIKS/005-Winiks-ERP/docs/DEVELOPMENT_LOG.md)

---

## Technology Stack

- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL (Supabase) + Drizzle ORM
- **Authentication & Security:** Supabase Auth + Row-Level Security (RLS) + Owner PIN Gate with 5-attempt rate-limiting lockout
- **Styling:** Tailwind CSS + Lucide Icons + Framer Motion
- **Document Generation:** jsPDF + html-to-image (A4 Vouchers & Registers)
- **Data Exchange:** PapaParse (CSV Migration & Exports)

---

## Running Locally

```bash
npm install
npm run dev
```

Server will run on `http://localhost:3000`.
