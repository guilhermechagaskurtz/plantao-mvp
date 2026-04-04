//lib/auth.ts
import { supabase } from './supabase'

export async function getUserWithProfile() {
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  if (!user) {
    return { user: null, profile: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile }
}

export async function requireRole(expected: 'admin' | 'doctor' | 'clinic') {
  const { user, profile } = await getUserWithProfile()

  if (!user || !profile || profile.type !== expected) {
    window.location.href = '/login'
    return null
  }

  return { user, profile }
}