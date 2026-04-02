import { createClient } from '@supabase/supabase-js'

export async function expandRadius() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase.rpc('expand_shift_radius')
}