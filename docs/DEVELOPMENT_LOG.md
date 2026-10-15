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

## [2026-10-14] - Phase 11: Kharedi Supplier Old Due Counting, Total Payable Math & New Vendor Opening Balance

### 1. Cumulative Supplier Old Due & Total Payable Math in Kharedi Setup
* **What Was Built:**
  - Upgraded Kharedi Setup checkout math in `src/app/erp/wholesale/purchase/components/KharediClient.tsx`:
    - `totalPayableWithDue = Purchase Bill (चालू बिल) + Old Due (मागील बाकी)`
    - `finalSupplierDebt = totalPayableWithDue - parsedAmountPaid`
    - `billDebtChange = totalAmount - parsedAmountPaid`
  - Replaced the simple 2-line box with a complete 3-tier financial breakdown:
    - **Purchase Bill (चालू बिल):** Total cost of current items inwarded.
    - **Old Due (मागील बाकी):** Previous un-settled vendor debt dynamically pulled from selected supplier's active balance.
    - **Total Payable (एकूण देय):** Combined total amount owed before this payment.
  - Revamped the Debt Badge under Amount Paid to display:
    - **Total Supplier Debt (एकूण बाकी):** Live net debt remaining after today's payment.
    - Breakdown showing both `Bill Net (+/-)` and `Previous Due`.
* **Business Rationale (Why?):**
  - In Indian wholesale trade, store owners frequently pay suppliers a lump-sum amount (e.g. paying ₹21,000 when current purchase is ₹2,020 and old balance is ₹21,645).
  - When the UI previously showed `Added to Supplier Debt: -₹18,980` instead of counting the ₹21,645 old due and showing the remaining ₹2,665 total debt, owners believed the ERP was discarding their old vendor balances.
  - Displaying the full equation (`Bill + Old Due = Total Payable - Paid = Remaining Debt`) provides total transparency and avoids cash discrepancies.

---

### 2. Walk-in Vendor Opening Due Balance Setup
* **What Was Built:**
  - Added an inline Opening Due input (`मागील बाकी`) when creating a New Supplier in `KharediClient.tsx`.
  - Updated the checkout API `src/app/api/erp/purchase/checkout/route.ts` to accept `openingBalance` and initialize `suppliers.current_balance` with this starting balance.
* **Business Rationale (Why?):**
  - When migrating to the ERP or purchasing from a new vendor who already has an outstanding ledger balance outside the system, the owner must be able to record this opening balance immediately without having to leave the purchase counter to visit Accounts Payable first.

---

### 3. Thermal Receipt Audit Breakdown for Purchase
* **What Was Built:**
  - Synchronized `src/app/erp/wholesale/components/SharedThermalReceipt.tsx` for purchase receipts to print the full accounting equation:
    - `Subtotal (चालू बिल)`
    - `Old Due (मागील बाकी)`
    - `Net Payable (एकूण देय)`
    - `Amount Paid (दिलेली रक्कम)` with payment method (CASH / ONLINE)
    - `Total Due (एकूण बाकी)` or `Advance Paid (आगाऊ जमा)`
  - Fixed supplier name passing so receipts and database records capture the actual selected vendor's name rather than defaulting to `Local Vendor`.
* **Business Rationale (Why?):**
  - Eliminates disputes between wholesale distributors and store owners by giving both parties a printed receipt proving exactly what was billed, what old dues existed, what was paid on the spot, and what remaining debt was booked.

---

## [2026-10-14] - Phase 12: Sales POS Cumulative Udhaari Math & Accounts Payable Supplier Creation

### 1. Cumulative Customer Udhaari, Total Payable & Change Math in Sales POS
* **What Was Built:**
  - Upgraded Sales POS checkout math in `src/app/erp/wholesale/pos/components/POSClient.tsx`:
    - `totalPayable = Net Total (चालू बिल) + Old Udhaari (मागील बाकी)`
    - `change = selectedCustomer ? Math.max(0, paid - totalPayable) : Math.max(0, paid - netTotal)`
    - `newUdhaari = selectedCustomer ? Math.max(0, totalPayable - paid) : 0`
  - Re-structured the Bill Summary card to present the full wholesale ledger:
    - **Subtotal (एकूण):** Sum of items in cart.
    - **Discount (सूट):** Applied invoice discount.
    - **Current Bill (चालू बिल):** Net amount for current items.
    - **Old Udhaari (मागील बाकी):** Previous uncollected credit balance owed by the selected buyer.
    - **Total Payable (एकूण देय):** Combined total required to completely clear their account.
  - Revamped Amount Received & Live Balance HUD:
    - Displays `Prev: ₹X → New Balance: ₹Y` dynamically as amount received is typed.
    - If customer pays a lump sum towards old udhaari + current bill (e.g., Priya Desai paying ₹5,000 against ₹10,968.75 old due + ₹864 bill), the system correctly subtracts the payment from total debt showing `Remaining Udhaari: ₹6,832.75` rather than misleadingly suggesting ₹4,136 change.
    - Change is now ONLY shown if the customer pays more than `Total Payable` (Current Bill + Old Udhaari).
  - Synchronized `src/app/api/erp/pos/checkout/route.ts` with `Math.max(0, prevBal + unpaid)` to prevent negative customer udhaari balances.
* **Business Rationale (Why?):**
  - Wholesale market buyers routinely make partial bulk payments towards their running ledger. Treating payments solely against the current invoice resulted in cashiers handing back money as "Change" when the buyer actually still owed substantial old debt.

---

### 2. Accounts Payable + New Supplier Modal & Supplier Directory Navigation
* **What Was Built:**
  - Added a dedicated **"+ New Supplier (नवीन पुरवठादार)"** action button and modal directly inside `src/app/erp/wholesale/ap/components/ClientAccountsPayable.tsx`.
  - The modal enables store owners to register:
    - **Supplier Name (नाव)**
    - **Contact Phone (फोन)**
    - **Opening Due Balance (मागील बाकी - ₹)** to log legacy vendor debts immediately.
  - Added direct **"Supplier Directory"** navigation link in Accounts Payable header and in the main navigation sidebar (`src/components/app-sidebar.tsx`).
  - Added multi-route revalidation (`/erp/wholesale/ap`, `/erp/wholesale/purchase`, `/erp/wholesale/vault`) inside `src/app/erp/wholesale/suppliers/actions.ts` when suppliers are created or updated.
* **Business Rationale (Why?):**
  - Store owners managing payables needed to create suppliers with starting debts directly from the Accounts Payable dashboard without jumping through multiple hidden screens.

---

### 3. Thermal Receipt Math Alignment Across Sales & Purchases
* **What Was Built:**
  - In `src/app/erp/wholesale/components/SharedThermalReceipt.tsx`, updated the sales receipt math block to `netPayable - amountPaid`, eliminating double-counted old dues and unifying sales and purchase thermal receipts.
* **Business Rationale (Why?):**
  - Ensures printed and PDF thermal receipts match counter screen math down to the exact rupee.

---

## [2026-10-15] - Phase 13: Supabase Session Auto-Refresh Middleware & POS LiveSync De-thrashing

### 1. Root Cause Analysis: Sudden Kickouts to Login Screen
* **What Was Happening:**
  - Cashiers reported that while creating bills in POS or navigating between screens, the application would abruptly kick them out and redirect to `/login` even though their database data was safely stored.
* **Why It Occurred (Technical Root Cause):**
  1. **Absence of `@supabase/ssr` Middleware:** Next.js Server Components (`layout.tsx`, `page.tsx`) run in a read-only request context where setting HTTP cookies is forbidden by Next.js architecture. When Supabase's default 1-hour JWT access token expired, `supabase.auth.getUser()` attempted to refresh the session and call `setAll()`, which failed and was caught by a fallback block. Because there was no `src/middleware.ts` to refresh the session cookie on HTTP requests, the browser retained an expired token. On the next server render, `getUser()` returned null and triggered `redirect('/login')`.
  2. **Aggressive Background LiveSync Polling & Print Dialog Focus Thrashing:** `src/components/LiveSyncProvider.tsx` had an active `setInterval` polling `router.refresh()` every 25 seconds, plus an un-throttled window `focus` event listener. When a cashier completed a bill and the thermal print dialog opened and closed, the window regained focus and immediately fired `router.refresh()`. The server component intercepted the un-refreshed cookie and abruptly redirected the cashier to `/login`.
  3. **Non-Singleton Browser Client Instance Recreation:** Multiple components were calling `createBrowserClient` ad-hoc, resetting client-side auth timers and memory state.

---

### 2. Architectural Solution Deployed
* **1. Supabase Session Refresh Middleware (`src/middleware.ts` & `src/utils/supabase/middleware.ts`):**
  - Engineered standard Next.js edge middleware that intercepts every application request before Server Components execute.
  - Automatically verifies and refreshes Supabase auth tokens and commits new `Set-Cookie` headers to the HTTP response.
  - Protected route guard ensures unauthenticated users are neatly directed to `/login`, while active users maintain permanent, seamless sessions that never expire during work.
* **2. LiveSync De-thrashing & Active POS Protection (`src/components/LiveSyncProvider.tsx`):**
  - Removed the aggressive 25-second poll interval; real-time CDC WebSockets and native BroadcastChannel already handle instant multi-tab sync.
  - Throttled window `focus` revalidation to at most once per 60 seconds so print dialog dismissals do not spam `router.refresh()`.
  - Added route-aware protection on `/erp/wholesale/pos` to prevent server re-renders while a cashier is actively working.
* **3. Browser Client Singleton (`src/utils/supabase/client.ts`):**
  - Memoized `createBrowserClient` with `auth: { persistSession: true, autoRefreshToken: true }` so client-side refresh timers are persistent and stable.

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
