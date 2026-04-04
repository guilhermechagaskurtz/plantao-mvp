import { supabase } from '@/lib/supabase'

export async function getDoctorNotifications(doctorId: string) {
    const { data, error } = await supabase
        .rpc('get_doctor_notifications', { p_doctor_id: doctorId })

    if (error) throw error
    return data
}

export async function markNotificationAsRead(
    notificationId: string,
    doctorId: string
) {
    const { error } = await supabase.rpc('mark_notification_as_read', {
        p_notification_id: notificationId,
        p_doctor_id: doctorId,
    })

    if (error) throw error
}

export async function getUnreadNotificationsCount(doctorId: string) {
    const { data, error } = await supabase.rpc(
        'get_unread_notifications_count',
        { p_doctor_id: doctorId }
    )

    if (error) throw error
    return data as number
}
export async function markAllNotificationsAsRead(doctorId: string) {
    const { error } = await supabase.rpc(
        'mark_all_notifications_as_read',
        { p_doctor_id: doctorId }
    )

    if (error) throw error
}