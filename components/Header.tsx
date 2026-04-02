/*
components/Header.tsx
*/
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname } from 'next/navigation'

export default function Header() {
  const [type, setType] = useState<'doctor' | 'clinic' | 'admin' | null>(null)
  const pathname = usePathname()

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
    <div className='bg-white border-b px-6 py-3 flex justify-between items-center'>
      <div className='font-semibold text-gray-900 text-lg'>
        Plantões
      </div>

      <div className='flex gap-4 items-center'>
        {type === 'doctor' && (
          <>
            <a
              href='/shifts'
              className={`text-sm transition ${pathname === '/shifts'
                ? 'text-blue-600 font-medium'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Plantões
            </a>

            <a
              href='/my-shifts'
              className={`text-sm transition ${pathname === '/my-shifts'
                ? 'text-blue-600 font-medium'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Meus plantões
            </a>

            <a
              href='/history'
              className={`text-sm transition ${pathname === '/history'
                ? 'text-blue-600 font-medium'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Histórico
            </a>

            <a
              href='/doctor'
              className={`text-sm transition ${pathname === '/doctor'
                ? 'text-blue-600 font-medium'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Perfil
            </a>
          </>
        )}

        {type === 'clinic' && (
          <>
            <a
              href='/clinic/shifts'
              className={`text-sm transition ${pathname === '/clinic/shifts'
                ? 'text-blue-600 font-medium'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Plantões
            </a>

            <a
              href='/clinic/financial'
              className={`text-sm transition ${pathname === '/clinic/financial'
                ? 'text-blue-600 font-medium'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Financeiro
            </a>
          </>
        )}

        {type === 'admin' && (
          <>
            <a
              href='/admin'
              className={`text-sm transition ${pathname === '/admin'
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Home
            </a>

            <a
              href='/admin/clinics'
              className={`text-sm transition ${pathname.startsWith('/admin/clinics')
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Clínicas
            </a>

            <a
              href='/admin/doctors'
              className={`text-sm transition ${pathname === '/admin/doctors'
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Médicos
            </a>
          </>
        )}

        <button onClick={logout} className='px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition'>
          Sair
        </button>
      </div>
    </div>
  )
}