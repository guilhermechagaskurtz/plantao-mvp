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
            console.log('AUTH LOAD')

            const { user: newUser, profile: newProfile } = await getUserWithProfile()
            if (!isMounted) return

            setUser((prev: any) => {
                if (prev?.id === newUser?.id) return prev
                return newUser
            })

            setProfile((prev: any) => {
                if (prev?.id === newProfile?.id) return prev
                return newProfile
            })

            setLoading(false)
        }

        load()

        const { data: listener } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                load()
            }
        })

        return () => {
            isMounted = false
            listener.subscription.unsubscribe()
        }
    }, [])

    return { user, profile, loading }
}