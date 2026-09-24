import { uploadProductsCsv, uploadCustomersCsv, uploadSuppliersCsv } from './actions'
import CsvUploaderCard from './CsvUploaderCard'
import DangerZone from './DangerZone'
import ClientGhostArchival from './ClientGhostArchival'

// ─── CSV Template data (base64 encoded inline, no file server needed) ───
const PRODUCTS_CSV = `Product Name,Name (Hindi) Optional,Name (Marathi) Optional,Barcode,Buy Price,Sell Price,Current Stock,Unit,Min Stock Alert
Parle G Gold,पारले जी गोल्ड,पार्ले जी गोल्ड,PG100,10,12,50,PCS,5
Tata Salt 1KG,टाटा नमक,टाटा मीठ,TS200,20,24,100,PCS,10
Amul Butter 500g,,,AB500,110,130,30,PCS,5`

const CUSTOMERS_CSV = `Customer Name,Phone,Udhaari Balance
Ramesh Patil,9876543210,500
Suresh Kale,9812345678,0
Ganesh More,9999988888,1200`

const SUPPLIERS_CSV = `Supplier Name,Phone,Company,Amount Owed
Vikram Traders,9876540000,Vikram Wholesale,5000
Metro Cash & Carry,1800222222,Metro,0`

function toCsvHref(csv: string) {
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
}

export default function SettingsPage() {
    return (
        <div className="p-8 animate-in fade-in duration-500 max-w-4xl mx-auto">

            {/* Header */}
            <div className="mb-10">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Settings & Data Hub</h1>
                <p className="text-slate-500 mt-1 font-medium">Initialize your shop with real business data. Download the template, fill it, and upload.</p>
            </div>

            {/* SECTION 1: DATA IMPORT */}
            <section className="mb-12">
                <div className="flex items-center space-x-3 mb-5">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Step 1 — Import Your Business Data</span>
                    <div className="flex-1 h-px bg-slate-200"></div>
                </div>
                <p className="text-sm text-slate-500 mb-6 -mt-2 font-medium">
                    All uploaded data is stamped with your Shop ID. Your data is mathematically isolated from every other shop on this platform.
                </p>

                <div className="space-y-4">
                    <CsvUploaderCard
                        label="Product Catalog"
                        description="Upload all your products with prices, barcodes, and stock levels"
                        icon="📦"
                        action={uploadProductsCsv}
                        templateHref={toCsvHref(PRODUCTS_CSV)}
                        templateName="winiks_products_template.csv"
                    />
                    <CsvUploaderCard
                        label="Customer List + Udhaari"
                        description="Import existing customers with their current outstanding balances"
                        icon="👥"
                        action={uploadCustomersCsv}
                        templateHref={toCsvHref(CUSTOMERS_CSV)}
                        templateName="winiks_customers_template.csv"
                    />
                    <CsvUploaderCard
                        label="Supplier List"
                        description="Import your vendors and their payable balances"
                        icon="🏭"
                        action={uploadSuppliersCsv}
                        templateHref={toCsvHref(SUPPLIERS_CSV)}
                        templateName="winiks_suppliers_template.csv"
                    />
                </div>
            </section>

            {/* SECTION 2: BILL ARCHIVE */}
            <ClientGhostArchival />

            {/* SECTION 3: DANGER ZONE (Owner Controlled) */}
            <DangerZone />

        </div>
    )
}
