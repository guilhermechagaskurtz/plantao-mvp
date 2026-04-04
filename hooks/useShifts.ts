//hooks/useShifts.ts
'use client'

import { useEffect, useState } from 'react'
import {
    getOpenShifts,
    getDoctorAcceptedShifts
} from '@/lib/services/shift'

export function useOpenShifts() {
    const [shifts, setShifts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            const { data } = await getOpenShifts()
            setShifts(data || [])
            setLoading(false)
        }

        load()
    }, [])

    return { shifts, loading, setShifts }
}

export function useDoctorShifts(doctorId: string | null) {
    const [shifts, setShifts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!doctorId) return

        const load = async () => {
            const { data } = await getDoctorAcceptedShifts(doctorId)
            setShifts(data || [])
            setLoading(false)
        }

        load()
    }, [doctorId])

    return { shifts, loading, setShifts }
}