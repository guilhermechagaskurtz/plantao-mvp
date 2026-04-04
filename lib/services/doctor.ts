//lib/services/doctor.ts
import { supabase } from '@/lib/supabase'

export async function getDoctorById(id: string) {
    return supabase
        .from('doctors')
        .select('*')
        .eq('id', id)
        .single()
}

export async function getDoctorSpecialties(id: string) {
    return supabase
        .from('doctor_specialties')
        .select('*')
        .eq('doctor_id', id)
}

export async function getDoctorInterests(id: string) {
    return supabase
        .from('doctor_interests')
        .select('*')
        .eq('doctor_id', id)
}