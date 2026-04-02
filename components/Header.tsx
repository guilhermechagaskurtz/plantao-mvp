/*
components/Header.tsx
*/
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Header() {
  const [type, setType] = useState<'doctor' | 'clinic' | 'admin' | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        setType(null)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('type')
        .eq('id', user.id)
        .single()

      if (profile) {
        setType(profile.type)
      }
    }

    loadProfile()

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadProfile()
    })

    return () => {
      listener.subscription.unsubscribe()
    }
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
            <a href='/my-shifts'>Meus plantões</a>
            <a href='/history'>Histórico</a>
            <a href='/doctor'>Perfil</a>
          </>
        )}

        {type === 'clinic' && (
          <>
            <a href='/clinic/shifts'>Plantões</a>
            <a href='/clinic/financial'>Financeiro</a>
          </>
        )}

        {type === 'admin' && (
          <>
            <a href='/admin'>Home</a>
            <a href='/admin/clinics'>Clínicas</a>
            <a href='/admin/doctors'>Médicos</a>
          </>
        )}

        <button onClick={logout} className='bg-red-600 px-3 py-1 rounded'>
          Sair
        </button>
      </div>
    </div>
  )
}