'use server'

import { db } from '@/db'
import { shops } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

/**
 * Handle form submissions directly from the God-Mode dashboard.
 */
export async function performAdminAction(formData: FormData) {
    const actionType = formData.get('actionType')?.toString()

    if (actionType === 'toggle_status') {
        const shopId = formData.get('shopId')?.toString()
        const targetStatus = formData.get('targetStatus')?.toString() === 'true'

        if (shopId) {
            try {
                await db.update(shops)
                    .set({ is_active: targetStatus })
                    .where(eq(shops.id, shopId))
            } catch (error) {
                console.error("ADMIN ERROR toggling shop:", error)
                throw new Error("Failed to mutate tenant matrix.")
            }
        }
    }

    if (actionType === 'provision_tenant') {
        const shopName = formData.get('shopName')?.toString()
        const categoryId = formData.get('categoryId')?.toString()
        const phone = formData.get('phone')?.toString()
        const address = formData.get('address')?.toString()
        const addressMr = formData.get('addressMr')?.toString()
        const shopNameMr = formData.get('shopNameMr')?.toString()
        const ownerPin = formData.get('ownerPin')?.toString() || '1234'
        const subscriptionPriceStr = formData.get('subscriptionPrice')?.toString()
        const subscriptionPrice = subscriptionPriceStr && !isNaN(parseInt(subscriptionPriceStr)) ? parseInt(subscriptionPriceStr) : 999

        if (!shopName || !categoryId) {
            throw new Error("Missing required fields: Shop Name and Category are required.")
        }

        try {
            // 1. Calculate next sequential ID (start from 1001)
            const allShops = await db.select({ id: shops.id }).from(shops)
            const nextCodeNumber = 1001 + allShops.length
            const tenantCode = nextCodeNumber.toString()

            // 2. Generate secure 6-character random password
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
            let generatedPassword = ''
            for (let i = 0; i < 6; i++) {
                generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length))
            }

            // 3. Create hidden Supabase Identity via Service Role
            const dummyEmail = `shop${tenantCode}@winiks.app`

            const { createClient: createServiceClient } = require('@supabase/supabase-js')
            const adminClient = createServiceClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
                email: dummyEmail,
                password: generatedPassword,
                email_confirm: true // bypass email validation
            })

            if (createError || !userData.user) {
                throw new Error(`Auth generation failed: ${createError?.message}`)
            }

            const ownerId = userData.user.id

            // 4. Record Tenant locally with strict 30-day billing loop
            await db.insert(shops).values({
                name: shopName,
                tenant_code: tenantCode,
                owner_id: ownerId,
                category_id: categoryId,
                phone: phone || null,
                address: address || null,
                address_mr: addressMr || null,
                name_mr: shopNameMr || null,
                owner_pin: ownerPin,
                subscription_price: subscriptionPrice,
                is_active: true
            })

            revalidatePath('/admin')

            // Return credentials to the frontend UI
            return {
                success: true,
                credentials: {
                    shopId: tenantCode,
                    password: generatedPassword
                }
            }

        } catch (error: any) {
            console.error("ADMIN PROVISION ERROR:", error)
            throw new Error(`Provisioning failed: ${error.message || 'Unknown error'}`)
        }
    }

    if (actionType === 'reset_tenant_credentials') {
        const shopId = formData.get('shopId')?.toString()
        if (!shopId) throw new Error("Missing Shop Payload")

        try {
            const targetShop = await db.select({ tenant_code: shops.tenant_code, owner_id: shops.owner_id })
                .from(shops).where(eq(shops.id, shopId)).limit(1)

            if (!targetShop.length || !targetShop[0].tenant_code) {
                throw new Error("Invalid Node Identity Map")
            }

            // Generate secure 6-character random password
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
            let generatedPassword = ''
            for (let i = 0; i < 6; i++) {
                generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length))
            }

            const { createClient: createServiceClient } = require('@supabase/supabase-js')
            const adminClient = createServiceClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            // Overwrite password directly utilizing God-Mode keys
            const { error: resetError } = await adminClient.auth.admin.updateUserById(targetShop[0].owner_id, {
                password: generatedPassword
            })

            if (resetError) throw resetError

            return {
                success: true,
                credentials: {
                    shopId: targetShop[0].tenant_code,
                    password: generatedPassword
                }
            }

        } catch (error: any) {
            console.error("ADMIN RESET ERROR:", error)
            throw new Error(`Credential cycle failed: ${error.message || 'Unknown error'}`)
        }
    }

    revalidatePath('/admin')
    return { success: true }
}

/**
 * Biometric Gated Password Reset for God-Mode CEO
 */
export async function resetRootPassword(email: string, birthdate: string, newPass: string) {
    if (birthdate !== "18/12/2004") {
        return { success: false, error: "SECURITY LOCKOUT: Incorrect biometric birthdate." }
    }

    try {
        const supabase = await createClient()
        // Must use SERVICE_ROLE_KEY to manipulate auth directly if we bypass SMTP
        const adminSupabase = await createClient() // wait, default createClient inside sever actions uses NEXT_PUBLIC ANON KEY, we must explicitly create an admin client

        // Quick bypass: The UI is hitting a Server Action. To manipulate another user's password without them being logged in, we must use process.env.SUPABASE_SERVICE_ROLE_KEY!
        const { createClient: createAdmin } = require('@supabase/supabase-js')
        const rootAdminAuth = createAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const list = await rootAdminAuth.auth.admin.listUsers()
        const targetUser = list.data.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())

        if (!targetUser) {
            return { success: false, error: "User identity does not exist in the root matrix." }
        }

        const { error } = await rootAdminAuth.auth.admin.updateUserById(targetUser.id, {
            password: newPass
        })

        if (error) throw error
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
