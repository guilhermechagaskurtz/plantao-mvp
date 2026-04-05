import { supabase } from '@/lib/supabase'

export const getIsPremium = async (doctorId: string) => {
    if (!doctorId) return false

    const { data, error } = await supabase
        .from('doctors')
        .select('is_premium')
        .eq('id', doctorId)
        .single()

    if (error || !data) return false

    return data.is_premium
}