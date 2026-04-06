//app/admin/create-clinic/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
    const {
        name,
        email,
        cnpj,
        phone,
        address,
        number,
        complement,
        city,
        state,
        zip_code,
        latitude,
        longitude
    } = await req.json()

    // 1. criar user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: '123456',
        email_confirm: true
    })

    if (error || !data.user) {
        return NextResponse.json({ error: error?.message }, { status: 400 })
    }

    const userId = data.user.id

    // 2. profile
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
            id: userId,
            type: 'clinic',
            approval_status: 'approved'
        })

    if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(userId)

        return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // 3. clinic
    const { error: clinicError } = await supabaseAdmin
        .from('clinics')
        .insert({
            id: userId,
            name,
            cnpj,
            email,
            phone,
            address,
            number,
            complement,
            city,
            state,
            zip_code,
            latitude,
            longitude
        })

    if (clinicError) {
        await supabaseAdmin.auth.admin.deleteUser(userId)

        return NextResponse.json({ error: clinicError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
}