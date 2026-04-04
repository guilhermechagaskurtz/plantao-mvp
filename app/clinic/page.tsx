/*
app/clinic/page.tsx
*/
'use client'

import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function ClinicPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [stats, setStats] = useState({ open: 0, accepted: 0 })

  useEffect(() => {
    if (authLoading) return

    if (!user || profile?.type !== 'clinic') {
      window.location.href = '/login'
      return
    }

    const load = async () => {
      setLoading(true)
      setError('')

      const { data: clinic } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', user.id)
        .single()

      if (clinic) {
        setName(clinic.name)
      }

      const { data: shifts } = await supabase
        .from('shifts')
        .select('status')
        .eq('clinic_id', user.id)

      if (shifts) {
        setStats({
          open: shifts.filter(s => s.status === 'open').length,
          accepted: shifts.filter(s => s.status === 'accepted').length
        })
      }

      setLoading(false)
    }

    load()
  }, [authLoading, user, profile])

  const handleSave = async () => {
    setError('')
    setSuccess('')

    if (!name) {
      setError('Informe o nome')
      return
    }

    setSubmitting(true)

    if (!user) {
      setError('Não autenticado')
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('clinics').upsert({
      id: user.id,
      name,
      latitude: -30,
      longitude: -51
    })

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    setSuccess('Dados salvos')
    setSubmitting(false)
  }

  return (
    <div className='flex flex-col gap-4'>
      {error && (
        <div className='bg-red-100 text-red-700 p-2 rounded'>
          {error}
        </div>
      )}

      {success && (
        <div className='bg-green-100 text-green-700 p-2 rounded'>
          {success}
        </div>
      )}

      {loading && (
        <div className='text-gray-500'>Carregando...</div>
      )}

      {!loading && (
        <>
          <div className='border p-4 rounded bg-white text-black'>
            <h2 className='font-bold mb-2'>Resumo</h2>
            <p>Plantões abertos: {stats.open}</p>
            <p>Plantões aceitos: {stats.accepted}</p>
          </div>

          <div className='border p-4 rounded bg-white text-black flex flex-col gap-2'>
            <h2 className='font-bold mb-2'>Dados da clínica</h2>

            <input
              placeholder='Nome da clínica'
              value={name}
              onChange={e => setName(e.target.value)}
              className='border p-2 rounded'
            />

            <button
              onClick={handleSave}
              disabled={submitting}
              className='p-2 bg-green-600 text-white rounded disabled:opacity-50'
            >
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          <a
            href='/clinic/shifts'
            className='p-3 bg-blue-600 text-white rounded text-center'
          >
            Gerenciar plantões
          </a>
        </>
      )}
    </div>
  )
}