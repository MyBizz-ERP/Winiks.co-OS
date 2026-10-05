import { uploadCustomersCsv, updateOwnerPin } from './actions'
import CsvUploaderCard from './CsvUploaderCard'
import DangerZone from './DangerZone'
import ClientGhostArchival from './ClientGhostArchival'
import PinChangeCard from './PinChangeCard'
import ShopIdentityCard from './ShopIdentityCard'

const CUSTOMERS_CSV = `Customer Name,Phone,Udhaari Balance
Ramesh Patil,9876543210,500
Suresh Kale,9812345678,0
Ganesh More,9999988888,1200`

function toCsvHref(csv: string) {
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
}

export default function SettingsPage() {
    return (
        <div className="p-6 md:p-8 animate-in fade-in duration-500 max-w-4xl mx-auto">

            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Settings</h1>
                <p className="text-slate-500 text-sm mt-1 font-medium">Manage your shop configuration, security, and data.</p>
            </div>

            {/* SECTION: SHOP IDENTITY (LOCALIZATION) */}
            <section className="mb-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Shop Configuration</p>
                <ShopIdentityCard />
            </section>

            {/* SECTION: SECURITY */}
            <section className="mb-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Security</p>
                <PinChangeCard action={updateOwnerPin} />
            </section>

            {/* SECTION: DATA IMPORT */}
            <section className="mb-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Data Import</p>
                <p className="text-xs text-slate-500 mb-4 font-medium">
                    All uploaded data is stamped with your Shop ID. Your data is mathematically isolated from every other shop on this platform.
                </p>
                <CsvUploaderCard
                    label="Customer List + Udhaari"
                    description="Import existing customers with their current outstanding balances"
                    icon="users"
                    action={uploadCustomersCsv}
                    templateHref={toCsvHref(CUSTOMERS_CSV)}
                    templateName="winiks_customers_template.csv"
                />
            </section>

            {/* SECTION: BILL ARCHIVE */}
            <section className="mb-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Invoice Archive</p>
                <ClientGhostArchival />
            </section>

            {/* SECTION: DANGER ZONE */}
            <DangerZone />

        </div>
    )
}

