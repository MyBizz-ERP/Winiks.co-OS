import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: { headers: request.headers },
    })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Protect Super Admin Routes
    if (!user && request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login')) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // 2. Protect ALL Client/Tenant ERP Routes (Titanium Security Wall)
    if (!user && request.nextUrl.pathname.startsWith('/erp')) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
