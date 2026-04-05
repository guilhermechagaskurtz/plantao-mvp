//app/clinic/layout.tsx
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function ClinicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll() {
                    // noop - evita loop de refresh
                },
            },
        }
    )

    const {
        data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user
    console.log('LAYOUT DEBUG USER:', user?.id)

    if (!user) {
        return (
            <div className='p-6 text-gray-500'>
                Carregando...
            </div>
        )
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('type')
        .eq('id', user.id)
        .single()

    console.log('LAYOUT DEBUG PROFILE:', profile)

    if (!profile) {
        return null
    }

    if (profile.type !== 'clinic') {
        redirect('/login')
    }

    return <>{children}</>
}