import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './components/SettingsClient'
import { db } from '@/db'
import { shops } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user) redirect('/login')

    const [shop] = await db.select().from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) redirect('/login')

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Platform Matrix & Ledger Injection</h1>
            <p className="text-sm text-slate-500 font-medium">Configure global print metadata and push legacy Udhaari logic streams natively into the production engine.</p>

            <SettingsClient shop={shop} />
        </div>
    )
}
