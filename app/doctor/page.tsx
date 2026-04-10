//app/doctor.page.tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ShiftItem = {
    id: string
    specialty: string
    start_time: string
    status: 'open' | 'accepted'
    accepted_doctor_id: string | null
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getLocalDateKey(date: Date) {
    return date.toISOString().split('T')[0]
}

export default function DoctorDashboard() {
    const { user, profile, loading: authLoading } = useAuth()

    const [acceptedShifts, setAcceptedShifts] = useState<ShiftItem[]>([])
    const [availableShifts, setAvailableShifts] = useState<ShiftItem[]>([])
    const [loading, setLoading] = useState(true)
    const [showAvailable, setShowAvailable] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [notifications, setNotifications] = useState<any[]>([])
    const [preferences, setPreferences] = useState<any[]>([])

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    useEffect(() => {
        if (authLoading) return

        if (!user || profile?.type !== 'doctor') {
            window.location.href = '/login'
            return
        }

        const load = async () => {
            setLoading(true)

            const now = new Date().toISOString()

            const { data: accepted } = await supabase
                .from('shifts')
                .select('*')
                .eq('accepted_doctor_id', user.id)
                .eq('status', 'accepted')
                .gt('start_time', now)

            const { data: available } = await supabase
                .from('shifts')
                .select('*')
                .eq('status', 'open')
                .gt('start_time', now)

            const { data: notifs } = await supabase
                .rpc('get_doctor_notifications', { p_doctor_id: user.id })

            const { data: prefs } = await supabase
                .from('doctor_notification_preferences')
                .select('*')
                .eq('doctor_id', user.id)
                .eq('in_app_enabled', true)

            setNotifications(notifs || [])
            setPreferences(prefs || [])

            setAcceptedShifts(accepted || [])
            setAvailableShifts(available || [])
            setLoading(false)
        }

        load()
    }, [authLoading, user, profile])

    const allItems = useMemo(() => {
        const accepted = acceptedShifts.map(s => ({ ...s, kind: 'accepted' as const }))
        const open = showAvailable
            ? availableShifts.map(s => ({ ...s, kind: 'open' as const }))
            : []

        return [...accepted, ...open].sort((a, b) => {
            if (a.kind !== b.kind) {
                return a.kind === 'accepted' ? -1 : 1
            }

            return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        })
    }, [acceptedShifts, availableShifts, showAvailable])

    const unreadShiftIds = useMemo(() => {
        return new Set(
            notifications
                .filter(n => !n.read)
                .map(n => n.shift_id)
        )
    }, [notifications])

    const grouped = useMemo(() => {
        const map: Record<string, Array<ShiftItem & { kind: 'accepted' | 'open' }>> = {}

        allItems.forEach(item => {
            const key = getLocalDateKey(new Date(item.start_time))
            if (!map[key]) map[key] = []
            map[key].push(item)
        })

        return map
    }, [allItems])

    function matchesPreference(shift: any) {
        if (!preferences.length) return true

        return preferences.some(pref => {
            if (pref.min_value && shift.value < pref.min_value) return false

            if (pref.city && shift.city !== pref.city) return false

            if (pref.specialties?.length) {
                if (!pref.specialties.includes(shift.specialty)) return false
            }

            return true
        })
    }

    if (authLoading || loading) {
        return <div className='p-6'>Carregando...</div>
    }

    if (isMobile) {
        return (
            <div className='p-4 flex flex-col gap-4'>
                <h1 className='text-lg font-bold'>Plantões</h1>

                <div className='flex flex-wrap gap-3 text-xs'>
                    <div className='flex items-center gap-1'>
                        <div className='w-3 h-3 bg-blue-100 rounded'></div>
                        <span>Aceito</span>
                    </div>

                    <div className='flex items-center gap-1'>
                        <div className='w-3 h-3 bg-yellow-100 rounded'></div>
                        <span>Notificação não lida</span>
                    </div>

                    <div className='flex items-center gap-1'>
                        <div className='w-3 h-3 bg-green-100 rounded'></div>
                        <span>Compatível com seus filtros</span>
                    </div>

                    <div className='flex items-center gap-1'>
                        <div className='w-3 h-3 bg-gray-100 rounded'></div>
                        <span>Outros disponíveis</span>
                    </div>
                </div>

                <label className='flex gap-2 text-sm'>
                    <input
                        type='checkbox'
                        checked={showAvailable}
                        onChange={e => setShowAvailable(e.target.checked)}
                    />
                    Mostrar disponíveis
                </label>

                {Object.entries(grouped).map(([date, items]) => (
                    <div key={date} className='flex flex-col gap-2'>
                        <div className='font-semibold'>
                            {new Date(date).toLocaleDateString()}
                        </div>

                        {items.map(item => (
                            <div
                                key={item.id}
                                onClick={() => {
                                    window.location.href = `/shifts/${item.id}`
                                }}
                                className={`p-3 rounded border cursor-pointer ${item.kind === 'accepted'
                                        ? 'bg-blue-100'
                                        : unreadShiftIds.has(item.id)
                                            ? 'bg-yellow-100'
                                            : matchesPreference(item)
                                                ? 'bg-green-100'
                                                : 'bg-gray-100'
                                    }`}
                            >
                                {new Date(item.start_time).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}{' '}
                                - {item.specialty}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        )
    }

    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDay = new Date(year, month, 1).getDay()
    const days = new Date(year, month + 1, 0).getDate()

    const cells = []

    for (let i = 0; i < firstDay; i++) {
        cells.push(<div key={`empty-${i}`} />)
    }

    for (let d = 1; d <= days; d++) {
        const date = new Date(year, month, d)
        const key = getLocalDateKey(date)
        const items = grouped[key] || []
        const visibleItems = items.slice(0, 3)
        const hiddenCount = items.length - visibleItems.length

        cells.push(
            <div key={d} className='border p-2 min-h-[120px] rounded'>
                <div className='text-sm font-semibold'>{d}</div>

                {visibleItems.map(item => (
                    <div
                        key={item.id}
                        onClick={() => {
                            window.location.href = `/shifts/${item.id}`
                        }}
                        className={`text-xs mt-1 px-1 rounded cursor-pointer ${item.kind === 'accepted'
                            ? 'bg-blue-200'
                            : unreadShiftIds.has(item.id)
                                ? 'bg-yellow-200'
                                : matchesPreference(item)
                                    ? 'bg-green-200'
                                    : 'bg-gray-200'
                            }`}
                    >
                        {new Date(item.start_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}{' '}
                        {item.specialty}
                    </div>
                ))}

                {hiddenCount > 0 && (
                    <div className='text-xs mt-1 text-gray-500'>
                        +{hiddenCount} mais
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className='p-6 flex flex-col gap-4'>
            <h1 className='text-xl font-bold'>Calendário</h1>
            <div className='flex flex-wrap gap-4 text-xs'>
                <div className='flex items-center gap-1'>
                    <div className='w-3 h-3 bg-blue-200 rounded'></div>
                    <span>Aceito</span>
                </div>

                <div className='flex items-center gap-1'>
                    <div className='w-3 h-3 bg-yellow-200 rounded'></div>
                    <span>Nova notificação</span>
                </div>

                <div className='flex items-center gap-1'>
                    <div className='w-3 h-3 bg-green-200 rounded'></div>
                    <span>Compatível com seus filtros</span>
                </div>

                <div className='flex items-center gap-1'>
                    <div className='w-3 h-3 bg-gray-200 rounded'></div>
                    <span>Outros</span>
                </div>
            </div>
            <label className='flex gap-2 text-sm'>
                <input
                    type='checkbox'
                    checked={showAvailable}
                    onChange={e => setShowAvailable(e.target.checked)}
                />
                Mostrar plantões disponíveis
            </label>

            <div className='grid grid-cols-7 gap-2'>
                {WEEK_DAYS.map(d => (
                    <div key={d} className='text-center font-semibold'>
                        {d}
                    </div>
                ))}
                {cells}
            </div>
        </div>
    )
}