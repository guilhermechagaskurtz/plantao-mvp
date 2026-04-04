//hooks/useHistoryPage.ts
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export function useHistoryPage() {
    const { user } = useAuth()
    const [shifts, setShifts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const load = async () => {
        setLoading(true)
        setError('')

        if (!user) return

        const { data, error } = await supabase
            .from('shifts')
            .select(`
        id,
        value,
        start_time,
        end_time,
        paid,
        payment_confirmed_by_doctor,
        missed_by_clinic,
        clinics:clinic_id (
          name,
          address,
          number,
          complement,
          city,
          state
        )
      `)
            .eq('accepted_doctor_id', user.id)
            .eq('status', 'accepted')
            .order('start_time', { ascending: false })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        const now = new Date()

        const past = (data || []).filter(s => new Date(s.end_time) < now)

        setShifts(past)
        setLoading(false)
    }

    useEffect(() => {
        load()
    }, [user])

    const confirmPayment = async (shift: any) => {
        const { error } = await supabase
            .from('shifts')
            .update({ payment_confirmed_by_doctor: true })
            .eq('id', shift.id)

        if (error) {
            setError(error.message)
            return
        }

        load()
    }

    return {
        shifts,
        loading,
        error,
        confirmPayment,
        setError
    }
}