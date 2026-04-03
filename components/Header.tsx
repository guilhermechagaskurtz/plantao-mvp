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
  const [open, setOpen] = useState(false)
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
    <div className='relative bg-white border-b px-6 py-3 flex justify-between items-center'>
      <div className='flex justify-between items-center w-full md:w-auto'>
        <div className='font-semibold text-gray-900 text-lg'>
          Plantões
        </div>

        <button
          className='md:hidden text-xl'
          onClick={() => setOpen(prev => !prev)}
        >
          ☰
        </button>
      </div>

      <div className='hidden md:flex gap-4 items-center'>
        {type === 'doctor' && (
          <>

            <a
              href='/doctor'
              className={`text-sm transition ${pathname === '/doctor'
                ? 'text-blue-600 font-medium'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Home
            </a>

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
              href='/doctor/profile'
              className={`text-sm transition ${pathname === '/doctor/profile'
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
      {open && (
        <div className='absolute top-full left-0 w-full md:hidden border-t px-6 py-3 flex flex-col gap-3 bg-white shadow-lg z-50'>

          {type === 'doctor' && (
            <>
              <a href='/doctor' onClick={() => setOpen(false)}>Home</a>
              <a href='/shifts' onClick={() => setOpen(false)}>Plantões</a>
              <a href='/my-shifts' onClick={() => setOpen(false)}>Meus plantões</a>
              <a href='/history' onClick={() => setOpen(false)}>Histórico</a>
              <a href='/doctor/profile' onClick={() => setOpen(false)}>Perfil</a>
            </>
          )}

          {type === 'clinic' && (
            <>
              <a href='/clinic/shifts' onClick={() => setOpen(false)}>Plantões</a>
              <a href='/clinic/financial' onClick={() => setOpen(false)}>Financeiro</a>
            </>
          )}

          {type === 'admin' && (
            <>
              <a href='/admin' onClick={() => setOpen(false)}>Home</a>
              <a href='/admin/clinics' onClick={() => setOpen(false)}>Clínicas</a>
              <a href='/admin/doctors' onClick={() => setOpen(false)}>Médicos</a>
            </>
          )}

          <button
            onClick={logout}
            className='px-3 py-1.5 bg-red-600 text-white rounded-md text-sm'
          >
            Sair
          </button>

        </div>
      )}
    </div>
  )
}