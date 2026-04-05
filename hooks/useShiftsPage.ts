//hooks/useShiftsPage.ts
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getOpenShifts } from '@/lib/services/shift'
import { getDistanceKm } from '@/lib/utils/distance'

export function useShiftsPage() {
    const { user } = useAuth()
    const [shifts, setShifts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [doctor, setDoctor] = useState<any>(null)
    const [acceptingId, setAcceptingId] = useState<string | null>(null)
    const [crmStatus, setCrmStatus] = useState<'ok' | 'missing' | 'pending' | 'rejected'>('ok')
    const [approvedSpecialties, setApprovedSpecialties] = useState<string[]>([])

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            setError('')

            if (!user) return

            const { data: doctor } = await supabase
                .from('doctors')
                .select('*')
                .eq('id', user.id)
                .single()

            setDoctor(doctor)

            const { data: preferences } = await supabase
                .from('doctor_notification_preferences')
                .select('latitude, longitude, radius_km')
                .eq('doctor_id', user.id)
                .maybeSingle()

            const { data: specialties } = await supabase
                .from('doctor_specialties')
                .select('*')
                .eq('doctor_id', user.id)

            setApprovedSpecialties(
                (specialties || [])
                    .filter(s => s.approved)
                    .map(s => s.specialty)
            )

            if (!doctor?.crm) {
                setCrmStatus('missing')
            } else if (!doctor?.crm_approved) {
                if (doctor?.crm_rejection_reason) {
                    setCrmStatus('rejected')
                } else {
                    setCrmStatus('pending')
                }
            } else {
                setCrmStatus('ok')
            }

            const { data, error } = await getOpenShifts()

            if (error) {
                setError(error.message)
                setLoading(false)
                return
            }

            const filtered = (data || []).filter(shift => {
                if (!preferences?.latitude || !preferences?.longitude) return true

                const dist = getDistanceKm(
                    preferences.latitude,
                    preferences.longitude,
                    shift.latitude,
                    shift.longitude
                )

                return dist <= (preferences.radius_km || 10)
            })

            const sorted = filtered.sort((a, b) => {
                if (!preferences?.latitude || !preferences?.longitude) return 0

                const distA = getDistanceKm(
                    preferences.latitude,
                    preferences.longitude,
                    a.latitude,
                    a.longitude
                )

                const distB = getDistanceKm(
                    preferences.latitude,
                    preferences.longitude,
                    b.latitude,
                    b.longitude
                )

                return distA - distB
            })

            setShifts(sorted)
            setLoading(false)
        }

        load()
    }, [user])

    const acceptShift = async (shift: any) => {
        const confirmed = window.confirm('Deseja aceitar este plantão?')
        if (!confirmed) return

        setAcceptingId(shift.id)

        if (!user) return

        const { error } = await supabase.rpc('accept_shift', {
            p_shift_id: shift.id,
            p_doctor_id: user.id
        })

        if (error) {
            if (error.message.includes('Conflito')) {
                setError('Você já possui um plantão neste horário')
            } else if (error.message.includes('RQE')) {
                setError('Você não possui RQE aprovado para este plantão')
            } else if (error.message.includes('Shift inválido')) {
                setError('Este plantão não está mais disponível')
            } else {
                setError('Erro ao aceitar plantão')
            }

            setAcceptingId(null)
            return
        }

        setShifts(prev => prev.filter(s => s.id !== shift.id))
        setSuccess('Plantão aceito')
        setAcceptingId(null)
    }

    return {
        shifts,
        loading,
        error,
        success,
        doctor,
        acceptingId,
        crmStatus,
        approvedSpecialties,
        acceptShift,
        setError,
        setSuccess
    }
}