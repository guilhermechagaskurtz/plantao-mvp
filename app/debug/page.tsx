'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugPage() {
    const [shifts, setShifts] = useState<any[]>([])

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase
                .from('shifts')
                .select('*')
                .eq('status', 'open')
                .order('start_time', { ascending: true })

            if (data) {
                setShifts(data)
            }
        }

        load()
    }, [])

    return (
        <div className="p-4">
            <h1 className="font-bold mb-4">Debug Shifts</h1>

            {shifts.map(shift => {
                const start = new Date(shift.start_time).getTime()
                const now = Date.now()
                const diffHours = (start - now) / (1000 * 60 * 60)

                return (
                    <div key={shift.id} className="border p-2 mb-2">
                        <div><b>ID:</b> {shift.id}</div>
                        <div><b>Start:</b> {shift.start_time}</div>
                        <div><b>diffHours:</b> {diffHours.toFixed(2)}</div>
                    </div>
                )
            })}
        </div>
    )
}