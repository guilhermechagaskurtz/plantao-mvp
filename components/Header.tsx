/*
components/Header.tsx
*/
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getUnreadNotificationsCount } from '@/lib/services/notifications'

export default function Header() {
  const pathname = usePathname()
  const { profile, loading } = useAuth()
  const type = profile?.type
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isPremium, setIsPremium] = useState(false)
  const [updatingPremium, setUpdatingPremium] = useState(false)



  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!profile?.id || type !== 'doctor') return

    const loadPremium = async () => {
      const { data } = await supabase
        .from('doctors')
        .select('is_premium')
        .eq('id', profile.id)
        .single()

      if (data) {
        setIsPremium(data.is_premium)
      }
    }

    loadPremium()

    let isMounted = true

    const load = async () => {
      const count = await getUnreadNotificationsCount(profile.id)
      if (isMounted) {
        setUnreadCount(count)
      }
    }

    load()

    const interval = setInterval(load, 5000)

    // 🔥 NOVO: escuta evento para zerar badge imediatamente
    const handleNotificationsRead = () => {
      if (isMounted) {
        setUnreadCount(0)
      }
    }

    window.addEventListener('notifications-read', handleNotificationsRead)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener('notifications-read', handleNotificationsRead)
    }
  }, [profile?.id, type])

  if (loading) {
    return (
      <div className='bg-white border-b px-6 py-3'>
        <div className='text-sm text-gray-400'>Carregando...</div>
      </div>
    )
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  //toggle premium
  const togglePremium = async () => {
    if (!profile?.id) return

    setUpdatingPremium(true)

    const newValue = !isPremium

    const { error } = await supabase
      .from('doctors')
      .update({ is_premium: newValue })
      .eq('id', profile.id)

    if (!error) {
      setIsPremium(newValue)

      window.dispatchEvent(
        new CustomEvent('premium-changed', { detail: newValue })
      )
    }

    setUpdatingPremium(false)
  }

  return (
    <div className='relative bg-white border-b px-6 py-3 flex justify-between items-center'>
      <div className='flex justify-between items-center w-full md:w-auto'>
        <div className='font-semibold text-gray-900 text-lg'>
          Plantões
        </div>

        <div className='relative md:hidden'>
          <button
            className='text-xl'
            onClick={() => setOpen(prev => !prev)}
          >
            ☰
          </button>

          {type === 'doctor' && unreadCount > 0 && (
            <span className='absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full' />
          )}
        </div>
      </div>
      {type && (
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
                Buscar Plantões
              </a>

              <a
                href='/my-shifts'
                className={`text-sm transition ${pathname === '/my-shifts'
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Plantões Aceitos
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
              <a
                href='/doctor/notifications/preferences'
                className={`text-sm transition ${pathname === '/doctor/notifications/preferences'
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Configurar Alertas
              </a>
              {!isPremium && (
                <a
                  href='/premium'
                  className='text-sm text-yellow-600 font-medium hover:underline'
                >
                  Seja Premium
                </a>
              )}
              <button
                onClick={togglePremium}
                disabled={updatingPremium}
                className={`text-xs px-2 py-1 rounded border ${isPremium
                  ? 'bg-yellow-400 text-black border-yellow-500'
                  : 'bg-gray-100 text-gray-600 border-gray-300'
                  }`}
              >
                {updatingPremium
                  ? '...'
                  : isPremium
                    ? 'Premium ON'
                    : 'Premium OFF'}
              </button>
              <a href='/doctor/notifications' className='relative'>
                <span className='text-sm'>🔔</span>

                {unreadCount > 0 && (
                  <span className='absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1.5'>
                    {unreadCount}
                  </span>
                )}
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
              <a
                href='/admin/shifts'
                className={`text-sm transition ${pathname === '/admin/shifts'
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Plantões
              </a>
            </>
          )}


          <button onClick={logout} className='px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition'>
            Deslogar
          </button>
        </div>
      )}
      {open && (
        <div className='absolute top-full left-0 w-full md:hidden border-t px-6 py-3 flex flex-col gap-3 bg-white shadow-lg z-50'>

          {type === 'doctor' && (
            <>
              <a
                href='/doctor'
                onClick={() => setOpen(false)}
                className={pathname === '/doctor' ? 'text-blue-600 font-medium' : ''}
              >
                Home
              </a>

              <a
                href='/shifts'
                onClick={() => setOpen(false)}
                className={pathname === '/shifts' ? 'text-blue-600 font-medium' : ''}
              >
                Buscar Plantões
              </a>

              <a
                href='/my-shifts'
                onClick={() => setOpen(false)}
                className={pathname === '/my-shifts' ? 'text-blue-600 font-medium' : ''}
              >
                Plantões Aceitos
              </a>

              <a
                href='/history'
                onClick={() => setOpen(false)}
                className={pathname === '/history' ? 'text-blue-600 font-medium' : ''}
              >
                Histórico
              </a>

              <a
                href='/doctor/profile'
                onClick={() => setOpen(false)}
                className={pathname === '/doctor/profile' ? 'text-blue-600 font-medium' : ''}
              >
                Perfil
              </a>
              <a
                href='/doctor/notifications/preferences'
                onClick={() => setOpen(false)}
                className={
                  pathname === '/doctor/notifications/preferences'
                    ? 'text-blue-600 font-medium'
                    : ''
                }
              >
                Configurar Alertas
              </a>
              <a
                href='/doctor/notifications'
                onClick={() => setOpen(false)}
              >
                Notificações {unreadCount > 0 && `(${unreadCount})`}
              </a>
              {!isPremium && (
                <a
                  href='/premium'
                  onClick={() => setOpen(false)}
                  className='text-sm text-yellow-600 font-medium'
                >
                  Seja Premium
                </a>
              )}
              <button
                onClick={togglePremium}
                disabled={updatingPremium}
                className='text-left text-sm'
              >
                {updatingPremium
                  ? 'Atualizando...'
                  : isPremium
                    ? 'Premium: ON'
                    : 'Premium: OFF'}
              </button>
            </>
          )}

          {type === 'clinic' && (
            <>
              <a
                href='/clinic/shifts'
                onClick={() => setOpen(false)}
                className={pathname === '/clinic/shifts' ? 'text-blue-600 font-medium' : ''}
              >
                Plantões
              </a>

              <a
                href='/clinic/financial'
                onClick={() => setOpen(false)}
                className={pathname === '/clinic/financial' ? 'text-blue-600 font-medium' : ''}
              >
                Financeiro
              </a>
            </>
          )}

          {type === 'admin' && (
            <>
              <a
                href='/admin'
                onClick={() => setOpen(false)}
                className={pathname === '/admin' ? 'text-blue-600 font-medium' : ''}
              >
                Home
              </a>

              <a
                href='/admin/clinics'
                onClick={() => setOpen(false)}
                className={pathname.startsWith('/admin/clinics') ? 'text-blue-600 font-medium' : ''}
              >
                Clínicas
              </a>

              <a
                href='/admin/doctors'
                onClick={() => setOpen(false)}
                className={pathname === '/admin/doctors' ? 'text-blue-600 font-medium' : ''}
              >
                Médicos
              </a>

              <a
                href='/admin/shifts'
                onClick={() => setOpen(false)}
                className={pathname === '/admin/shifts' ? 'text-blue-600 font-medium' : ''}
              >
                Plantões
              </a>
            </>
          )}


          <button
            onClick={logout}
            className='px-3 py-1.5 bg-red-600 text-white rounded-md text-sm'
          >
            Deslogar
          </button>

        </div>
      )}
    </div>
  )
}