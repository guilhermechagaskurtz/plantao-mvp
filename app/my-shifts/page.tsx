/*
app/my-shifts/page.tsx
*/
'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function MyShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [doctor, setDoctor] = useState<any>(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError('')

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) {
      setError('Não autenticado')
      setLoading(false)
      return
    }

    const { data: doctor } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!doctor) {
      setError('Perfil não encontrado')
      setLoading(false)
      return
    }

    setDoctor(doctor)

    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('accepted_doctor_id', user.id)
      .eq('status', 'accepted')
      .order('start_time', { ascending: true })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const now = new Date()

    const filtered = (data || []).filter(s => {
      const end = new Date(s.end_time)

      // mostra:
      // - plantões futuros
      // - OU já iniciados mas ainda não finalizados pelo médico
      return end > now || !s.finished_by_doctor
    })

    setShifts(filtered)
    setLoading(false)
  }

  const cancelShift = async (shift: any) => {
    const { error } = await supabase
      .from('shifts')
      .update({
        status: 'open',
        accepted_doctor_id: null
      })
      .eq('id', shift.id)

    if (error) {
      setError(error.message)
      return
    }

    load()
  }

  const finishShift = async (shift: any) => {
    const { error } = await supabase
      .from('shifts')
      .update({ finished_by_doctor: true })
      .eq('id', shift.id)

    if (error) {
      setError(error.message)
      return
    }

    load()
  }

  return (
    <div className='flex flex-col gap-X'>
      <h1 className='text-xl font-bold'>Meus plantões</h1>

      {error && (
        <div className='bg-red-100 text-red-700 p-2 rounded'>
          {error}
        </div>
      )}

      {loading && <div>Carregando...</div>}

      {!loading && shifts.length === 0 && (
        <div className='text-gray-500'>Nenhum plantão futuro</div>
      )}

      {!loading && shifts.map(shift => (
        <div key={shift.id} className='border p-4 bg-white text-black rounded'>
          <p><b>Especialidade:</b> {shift.specialty}</p>

          <p>
            <b>Início:</b>{' '}
            {new Date(shift.start_time).toLocaleString()}
          </p>

          <p>
            <b>Fim:</b>{' '}
            {new Date(shift.end_time).toLocaleString()}
          </p>

          {new Date(shift.start_time) > new Date() && (
            <button
              onClick={() => cancelShift(shift)}
              className='mt-2 p-2 bg-red-600 text-white rounded'
            >
              Cancelar plantão
            </button>
          )}
          {new Date(shift.start_time) < new Date() && !shift.finished_by_doctor && (
            <button
              onClick={() => finishShift(shift)}
              className='mt-2 p-2 bg-blue-600 text-white rounded'
            >
              Finalizar plantão
            </button>
          )}
        </div>
      ))}
    </div>
  )
}