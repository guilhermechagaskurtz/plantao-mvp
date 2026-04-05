//lib/services/shifts.ts
import { supabase } from '@/lib/supabase'

export async function getOpenShifts() {
  return supabase
    .from('shifts')
    .select(`
      *,
      clinics:clinic_id (
        name,
        address,
        number,
        complement,
        city,
        state
      )
    `)
    .eq('status', 'open')
    .gt('start_time', new Date().toLocaleString('sv-SE').replace(' ', 'T'))
}

export async function getDoctorAcceptedShifts(doctorId: string) {
  return supabase
    .from('shifts')
    .select(`
      *,
      clinics:clinic_id (
        name,
        address,
        number,
        complement,
        city,
        state
      )
    `)
    .eq('accepted_doctor_id', doctorId)
    .eq('status', 'accepted')
}

export async function getShiftById(id: string) {
  return supabase
    .from('shifts')
    .select(`
      *,
      clinics:clinic_id (
        name,
        address,
        number,
        complement,
        city,
        state
      )
    `)
    .eq('id', id)
    .single()
}