//hooks/useMyShiftsPage.ts
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getDoctorAcceptedShifts } from '@/lib/services/shift'

export function useMyShiftsPage() {
    const { user } = useAuth()
    const [shifts, setShifts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [doctor, setDoctor] = useState<any>(null)

    const load = async () => {
        setLoading(true)
        setError('')

        if (!user) {
            return
        }

        const { data: doctor } = await supabase
            .from('doctors')
            .select('*')
            .eq('id', user.id)
            .single()

        if (!doctor) {
            setError('Perfil não encontrado')
            setLoading(false)
            return
        }

        setDoctor(doctor)

        const { data, error } = await getDoctorAcceptedShifts(user.id)

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        const now = new Date()

        const filtered = (data || []).filter(s => {
            const end = new Date(s.end_time)
            return end > now || !s.finished_by_doctor
        })

        setShifts(filtered)
        setLoading(false)
    }

    useEffect(() => {
        load()
    }, [user])

    const cancelShift = async (shift: any) => {
        const confirmed = window.confirm(
            `Tem certeza que deseja cancelar este plantão?\n\n${shift.specialty} - ${new Date(shift.start_time).toLocaleString()}`
        )

        if (!confirmed) return

        const { error } = await supabase
            .from('shifts')
            .update({
                status: 'open',
                accepted_doctor_id: null
            })
            .eq('id', shift.id)

        if (error) {
            setError(error.message)
            return
        }

        load()
    }

    const finishShift = async (shift: any) => {
        if (shift.missed_by_clinic) {
            setError('Este plantão foi marcado como falta pela clínica')
            return
        }

        const { error } = await supabase
            .from('shifts')
            .update({ finished_by_doctor: true })
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
        doctor,
        cancelShift,
        finishShift,
        setError
    }
}