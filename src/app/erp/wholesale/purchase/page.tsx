import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import KharediClient from './components/KharediClient'
import { db } from '@/db'
import { shops, products, suppliers } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function PurchaseKharediPage() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user) redirect('/login')

    // Find the master tenant associated with the logged-in User
    const [shop] = await db.select().from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) redirect('/login')

    // Pre-fetch all catalog products and suppliers mapped to this tenant
    const catalog = await db.select().from(products).where(eq(products.shop_id, shop.id))
    const supplierList = await db.select().from(suppliers).where(eq(suppliers.shop_id, shop.id))

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <KharediClient
                initialProducts={catalog}
                initialSuppliers={supplierList}
                shopInfo={{
                    id: shop.id,
                    name: shop.name,
                    name_mr: shop.name_mr,
                    address: shop.address,
                    address_mr: shop.address_mr,
                    phone: shop.phone
                }}
            />
        </div>
    )
}
