//doctor/notifications/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { markAllNotificationsAsRead } from '@/lib/services/notifications'
import {
    getDoctorNotifications,
    markNotificationAsRead,
} from '@/lib/services/notifications'

export default function NotificationsPage() {
    const { profile } = useAuth()
    const router = useRouter()
    const [notifications, setNotifications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!profile?.id) return

        const load = async () => {
            setLoading(true)
            const data = await getDoctorNotifications(profile.id)
            setNotifications(data || [])
            setLoading(false)
        }

        load()
    }, [profile?.id])

    const handleOpen = async (n: any) => {
        if (!n.read) {
            await markNotificationAsRead(n.id, profile.id)

            setNotifications(prev =>
                prev.map(item =>
                    item.id === n.id ? { ...item, read: true } : item
                )
            )
        }

        router.push(`/shifts/${n.shift_id}`)
    }

    if (loading) {
        return <div className='p-6'>Carregando...</div>
    }

    return (
        <div className='p-6 max-w-3xl mx-auto'>
            <div className='flex justify-between items-center mb-4'>
                <h1 className='text-xl font-semibold'>Notificações</h1>

                {notifications.length > 0 && (
                    <button
                        onClick={async () => {
                            await markAllNotificationsAsRead(profile.id)

                            setNotifications(prev =>
                                prev.map(n => ({ ...n, read: true }))
                            )
                        }}
                        className='text-sm text-blue-600 hover:underline'
                    >
                        Marcar todas como lidas
                    </button>
                )}
            </div>

            {notifications.length === 0 && (
                <div className='text-gray-500'>Nenhuma notificação</div>
            )}

            <div className='flex flex-col gap-3'>
                {notifications.map(n => (
                    <div
                        key={n.id}
                        onClick={() => handleOpen(n)}
                        className={`p-4 border rounded cursor-pointer transition
              ${n.read ? 'bg-white' : 'bg-blue-50 border-blue-200'}
            `}
                    >
                        <div className='font-medium'>{n.title}</div>
                        <div className='text-sm text-gray-600'>{n.message}</div>

                        {!n.read && (
                            <div className='text-xs text-blue-600 mt-1'>
                                Não lida
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}