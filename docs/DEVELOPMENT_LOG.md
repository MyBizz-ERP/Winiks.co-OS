# WINIKS Co-OS ERP - Master Engineering & Product Changelog

This document tracks all features, technical architecture changes, dates of implementation, and the core **business rationale** behind every major decision in the Winiks Co-OS Wholesale ERP system.

---

## [2026-10-14] - Phase 10: Financial Hardening, Pre-Reset Triple Backup, Rate Limiting & Clean PDF Exports

### 1. Persistent Balance Sheet Decoupling in Day-End Vault
* **What Was Built:**
  - Decoupled `Net Receivable` (Customer Udhaari) and `Net Account Payable` (Vendor Dues) in the Day-End Vault HUD (`src/app/erp/wholesale/vault/components/VaultClient.tsx`).
  - Switched formulas to pull directly from persistent cumulative ledger accounts:
    - `totalReceivable = customers.reduce(sum of old_balance)`
    - `totalPayable = suppliers.reduce(sum of current_balance)`
* **Business Rationale (Why?):**
  - In a wholesale enterprise, periods or cycles (e.g., month-end, fiscal year-end, or seasonal batch closes) are frequently closed to keep the active sales and purchase history clean and lightweight.
  - Previously, when transactions were reset, the Vault HUD derived receivables and payables only from the active filtered period's invoices and bills. This caused ongoing market credit and vendor debts to misleadingly drop or appear as zero.
  - Real-world business balance sheets are persistent: **wiping bill history must never erase the money market clients owe to the owner or debts the owner owes to distributors**. By binding the HUD directly to `customers.old_balance` and `suppliers.current_balance`, the store's true financial standing is 100% preserved and immune to transaction resets.

---

### 2. Mandatory 3-Part Pre-Reset Backup Gate
* **What Was Built:**
  - Replaced the single pre-reset button with a strict 3-Part Financial Backup Suite in `src/app/erp/wholesale/settings/components/SettingsClient.tsx`:
    1. **Backup 1: Sales Register Backup:** Multi-page A4 PDF register + CSV spreadsheet of all customer invoices.
    2. **Backup 2: Kharedi Purchase Register Backup:** Multi-page A4 PDF register + CSV spreadsheet of all vendor purchase bills.
    3. **Backup 3: Financial Vault & Balance Sheet Statement:** Comprehensive CSV statement containing all Customer Udhaari balances, Supplier AP dues, and live product stock asset valuations.
  - Added a **"Download All 3 At Once"** master trigger.
  - Added green verification badges (`✓ Ready`) for each backup.
  - Hard-gated the "Execute Period Reset" button until all 3 financial backups have been generated.
* **Business Rationale (Why?):**
  - **Zero-Loss Guarantee:** In SaaS ERP products, accidental data loss from an owner or cashier clicking a wipe button without an archive can destroy a business.
  - Gating the destruction behind verified, multi-format archives (A4 PDFs for printable audit records and CSVs for spreadsheet accounting) guarantees the owner can always inspect or legally defend past transactions even after clearing high-velocity transaction tables.

---

### 3. Brute-Force Rate Limiting & 4-Digit PIN Lockout
* **What Was Built:**
  - Implemented 5-attempt rate-limiting brute-force lockout on both:
    - The Master Entry Gate (`src/components/OwnerSecurityGate.tsx`)
    - The Period Reset Authorization Gate (`src/app/erp/wholesale/settings/components/SettingsClient.tsx`)
  - Added real-time countdown timer (`MM:SS`) ticking down across page reloads using browser persistence.
  - On 5 consecutive failed PIN attempts:
    - Enforces an immediate 15-minute lockout (900 seconds).
    - Disables input fields and submit actions.
    - Displays an animated security alert banner.
  - When authorized correctly, resets attempt counters.
* **Business Rationale (Why?):**
  - A 4-digit numeric PIN has only 10,000 combinations. An unauthorized employee, curious staff member, or malicious actor on an unattended store terminal could easily script or rapidly guess the PIN in minutes.
  - Capping attempts at 5 and imposing a 15-minute lockout renders automated or manual brute-force attacks mathematically unfeasible, protecting store settings, owner credentials, and master financial data.

---

### 4. Anti-Double-Click & Tactile Micro-Animations
* **What Was Built:**
  - Added `active:scale-95 transition-all duration-150` micro-animations to all interactive action buttons.
  - Added explicit busy loading states (`isSaving`, `isResetting`, `isBackingUp`) that disable buttons immediately upon initial click and render animated SVG spinners.
  - Dynamic button status labels (e.g., `Exporting...`, `Processing Wipe...`, `Deploying Metadata...`).
* **Business Rationale (Why?):**
  - Shopkeepers operating in high-pressure counter environments often click buttons multiple times if they do not see immediate feedback, triggering duplicate server requests or double-submissions.
  - Instant micro-compression animations and immediate loading states reassure the owner that their command was registered, eliminating confusion and preventing duplicate actions.

---

### 5. Multi-Page A4 Voucher & Register PDF Engine with Clean Numeric Glyphs
* **What Was Built:**
  - Engineered clean A4 Purchase Bill Vouchers and Multi-Page Purchase History Registers (`src/utils/historyPdfExport.ts`).
  - Switched currency prefixes from UTF-8 Unicode glyphs (`₹` / `\xE2\x82\xB9`) to universal ISO format (`Rs.`).
  - Configured high-resolution vector layout with shop branding, supplier details, itemized matrices, subtotal/tax rows, and signature lines.
* **Business Rationale (Why?):**
  - Standard Helvetica fonts in PDF generators produce font encoding corruption when rendering raw Unicode Indian Rupee symbols, resulting in unreadable characters like `â‚¹` on printed client invoices.
  - Using universal `Rs.` strings ensures clean rendering on any laser printer, thermal printer, or mobile PDF reader across India.

---

### 6. Kharedi Purchase Module Parity with POS & Min Wholesale Qty
* **What Was Built:**
  - Set default line item quantity to `0` across POS and Kharedi clients to force deliberate quantity entry and prevent unintended single-item sales.
  - Added full keyboard hotkey parity to Kharedi (`POSClient.tsx` & `KharediClient.tsx`):
    - `Escape` jumps to Search/Supplier.
    - `Enter` advances to grid or commits.
    - `F3` opens Search, `F4` opens Barcode, `F10` triggers Save & Print.
  - Displayed Minimum Wholesale Quantity badge inline in product selection grids.
* **Business Rationale (Why?):**
  - Wholesale cashiers work at lightning speed without a mouse. Inconsistent keyboard behavior between Purchase and Sales increases operator error and slows down billing.
  - Defaulting quantity to 0 eliminates ghost entries when barcoding multiple products.

---

## Core System Architecture Reference

| Module | Route / File | Core Responsibility |
| :--- | :--- | :--- |
| **POS Checkout** | `src/app/erp/wholesale/pos/` | Sub-millisecond retail & wholesale billing with offline IndexedDB memory |
| **Kharedi Inward** | `src/app/erp/wholesale/purchase/` | Inward inventory acquisition, supplier balance tracing, and purchase bill generation |
| **Purchase History**| `src/app/erp/wholesale/purchase/history/` | Audit trail of purchase bills, voiding, cloning, and A4 PDF voucher re-printing |
| **Day-End Vault** | `src/app/erp/wholesale/vault/` | Accrual profit calculation, drawer liquidity audit, persistent market Udhaari and vendor AP HUD |
| **Accounts Payable**| `src/app/erp/wholesale/ap/` | Vendor debt tracking, payment settlement, and legacy ledger management |
| **Udhaari Ledger** | `src/app/erp/wholesale/udhaari/` | Customer credit limits, pending collections, and WhatsApp reminder dispatch |
| **Master Settings** | `src/app/erp/wholesale/settings/` | Multi-lingual metadata, credentials, CSV template injection, and 3-part gated period reset |
