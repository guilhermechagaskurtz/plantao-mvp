'use client'

import { useEffect, useState } from 'react'
import { getUserWithProfile } from '@/lib/auth'

export function useAuth() {
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            const { user, profile } = await getUserWithProfile()
            setUser(user)
            setProfile(profile)
            setLoading(false)
        }

        load()
    }, [])

    return { user, profile, loading }
}