'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Header() {
  const [type, setType] = useState<'doctor' | 'clinic' | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('type')
        .eq('id', user.id)
        .single()

      if (profile) {
        setType(profile.type)
      }
    }

    load()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className='bg-gray-900 text-white p-4 flex justify-between items-center'>
      <div className='font-bold'>Plantões</div>

      <div className='flex gap-4 items-center'>
        {type === 'doctor' && (
          <>
            <a href='/shifts'>Plantões</a>
            <a href='/doctor'>Perfil</a>
          </>
        )}

        {type === 'clinic' && (
          <>
            <a href='/clinic/shifts'>Plantões</a>
          </>
        )}

        <button onClick={logout} className='bg-red-600 px-3 py-1 rounded'>
          Sair
        </button>
      </div>
    </div>
  )
}