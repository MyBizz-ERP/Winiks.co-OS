'use server'

import { supabaseAdmin } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createCategory(formData: FormData) {
    const name = formData.get('name') as string
    const display_name = formData.get('display_name') as string

    if (!name || !display_name) return

    const formattedName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_')

    const { error } = await supabaseAdmin.from('categories').insert([{
        name: formattedName,
        display_name: display_name,
        health_status: 'GREEN'
    }])

    if (error) { console.error("Supabase Error during insert:", error) }

    revalidatePath('/admin/categories')
    revalidatePath('/admin/dashboard')
}

export async function updateCategory(formData: FormData) {
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const display_name = formData.get('display_name') as string

    if (!id || !name || !display_name) return

    const formattedName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_')

    await supabaseAdmin.from('categories').update({ name: formattedName, display_name }).eq('id', id)

    revalidatePath(`/admin/categories/${id}`)
    revalidatePath('/admin/categories')

    redirect('/admin/categories')
}

export async function deleteCategory(formData: FormData) {
    const id = formData.get('id') as string
    if (!id) return

    await supabaseAdmin.from('categories').delete().eq('id', id)

    revalidatePath('/admin/categories')
    revalidatePath('/admin/dashboard')
    redirect('/admin/categories')
}
