import { supabase } from './supabase'

export async function expandRadius() {
  await supabase.rpc('expand_shift_radius')
}