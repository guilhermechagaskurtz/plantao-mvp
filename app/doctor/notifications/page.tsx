//doctor/notifications/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import {
    getDoctorNotifications,
    markAllNotificationsAsRead,
} from '@/lib/services/notifications'
import { supabase } from '@/lib/supabase'

type NotificationItem = {
    id: string
    shift_id: string
    title: string
    message: string
    created_at: string
    read: boolean
    highlight: boolean
}

type NotificationResponseItem = {
    id: string
    shift_id: string
    title: string
    message: string
    created_at: string
    read: boolean
}

export default function NotificationsPage() {
    const { profile } = useAuth()
    const router = useRouter()

    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<string[]>([])

    useEffect(() => {
        if (!profile?.id) return

        const load = async () => {
            setLoading(true)

            const data = await getDoctorNotifications(profile.id)

            const withHighlight: NotificationItem[] = ((data || []) as NotificationResponseItem[]).map((n: NotificationResponseItem) => ({
                ...n,
                highlight: !n.read
            }))

            setNotifications(withHighlight)

            await markAllNotificationsAsRead(profile.id)

            window.dispatchEvent(new Event('notifications-read'))

            setLoading(false)
        }

        load()
    }, [profile?.id])

    const handleOpen = async (n: NotificationItem) => {
        router.push(`/shifts/${n.shift_id}`)
    }

    const toggleSelect = (id: string) => {
        setSelected(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        )
    }

    const selectAll = () => {
        setSelected(notifications.map(n => n.id))
    }

    const clearSelection = () => {
        setSelected([])
    }

    const deleteSelected = async () => {
        if (!profile?.id || selected.length === 0) return

        await supabase
            .from('notification_reads')
            .delete()
            .in('notification_id', selected)
            .eq('doctor_id', profile.id)

        await supabase
            .from('notification_targets')
            .delete()
            .in('notification_id', selected)
            .eq('doctor_id', profile.id)

        setNotifications(prev => prev.filter(n => !selected.includes(n.id)))
        setSelected([])
    }

    const deleteOne = async (id: string) => {
        if (!profile?.id) return

        await supabase
            .from('notification_reads')
            .delete()
            .eq('notification_id', id)
            .eq('doctor_id', profile.id)

        await supabase
            .from('notification_targets')
            .delete()
            .eq('notification_id', id)
            .eq('doctor_id', profile.id)

        setNotifications(prev => prev.filter(n => n.id !== id))
        setSelected(prev => prev.filter(selectedId => selectedId !== id))
    }

    if (loading) {
        return <div className='p-6'>Carregando...</div>
    }

    return (
        <div className='p-6 max-w-3xl mx-auto'>
            <div className='flex flex-col gap-3 mb-4'>
                <div className='flex justify-between items-center'>
                    <h1 className='text-xl font-semibold'>Notificações</h1>

                    {selected.length > 0 && (
                        <div className='text-xs text-gray-500'>
                            {selected.length} selecionada(s)
                        </div>
                    )}
                </div>

                <div className='flex flex-wrap gap-2'>
                    <button
                        onClick={selectAll}
                        className='px-3 py-1.5 text-sm border rounded-md bg-white hover:bg-gray-50 transition'
                    >
                        Selecionar todas
                    </button>

                    <button
                        onClick={clearSelection}
                        disabled={selected.length === 0}
                        className='px-3 py-1.5 text-sm border rounded-md bg-white hover:bg-gray-50 disabled:opacity-40'
                    >
                        Limpar
                    </button>

                    <button
                        onClick={deleteSelected}
                        disabled={selected.length === 0}
                        className='px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-40'
                    >
                        Excluir selecionadas
                    </button>
                </div>
            </div>

            {notifications.length === 0 && (
                <div className='text-gray-500'>Nenhuma notificação</div>
            )}

            <div className='flex flex-col gap-3'>
                {notifications.map((n: NotificationItem) => (
                    <div
                        key={n.id}
                        className={`p-4 border rounded-lg transition flex justify-between items-start gap-3 ${n.highlight ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                            }`}
                    >
                        <div
                            onClick={() => handleOpen(n)}
                            className='cursor-pointer flex-1 min-w-0'
                        >
                            <div className='font-medium text-gray-900'>{n.title}</div>
                            <div className='text-sm text-gray-600 mt-1 break-words'>{n.message}</div>
                        </div>

                        <div className='flex flex-col items-end gap-2 shrink-0'>
                            <input
                                type='checkbox'
                                checked={selected.includes(n.id)}
                                onChange={() => toggleSelect(n.id)}
                                className='w-4 h-4 cursor-pointer'
                            />

                            <button
                                onClick={() => deleteOne(n.id)}
                                className='text-xs font-medium px-2.5 py-1 rounded-md border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition'
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}