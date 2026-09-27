import { uploadCustomersCsv } from './actions'
import CsvUploaderCard from './CsvUploaderCard'
import DangerZone from './DangerZone'
import ClientGhostArchival from './ClientGhostArchival'


// ─── CSV Template data (base64 encoded inline, no file server needed) ───
const CUSTOMERS_CSV = `Customer Name,Phone,Udhaari Balance
Ramesh Patil,9876543210,500
Suresh Kale,9812345678,0
Ganesh More,9999988888,1200`

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
                        label="Customer List + Udhaari"
                        description="Import existing customers with their current outstanding balances"
                        icon="👥"
                        action={uploadCustomersCsv}
                        templateHref={toCsvHref(CUSTOMERS_CSV)}
                        templateName="winiks_customers_template.csv"
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
