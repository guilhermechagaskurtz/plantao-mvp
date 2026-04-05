'use client'

import { useEffect, useState } from 'react'
import { getUserWithProfile } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export function useAuth() {
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        const load = async () => {
            const { user, profile } = await getUserWithProfile()
            if (!isMounted) return

            setUser(user)
            setProfile(profile)
            setLoading(false)
        }

        load()

        const { data: listener } = supabase.auth.onAuthStateChange(() => {
            load()
        })

        return () => {
            isMounted = false
            listener.subscription.unsubscribe()
        }
    }, [])

    return { user, profile, loading }
}