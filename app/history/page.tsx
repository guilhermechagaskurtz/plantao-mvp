/*
app/history/page.tsx
*/
'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function HistoryPage() {
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

    const { data, error } = await supabase
      .from('shifts')
      .select('id, value, start_time, end_time, paid')
      .eq('accepted_doctor_id', user.id)
      .eq('status', 'accepted')
      .order('start_time', { ascending: false })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const now = new Date()

    const past = (data || []).filter(s => new Date(s.end_time) < now)

    setShifts(past)
    setLoading(false)
  }

  return (
    <div className='flex flex-col gap-X'>
      <h1 className='text-xl font-bold'>Histórico</h1>

      {error && <div className='text-red-500'>{error}</div>}

      {loading && <div>Carregando...</div>}

      {!loading && shifts.length === 0 && (
        <div className='text-gray-500'>Nenhum plantão finalizado</div>
      )}

      {!loading && shifts.map(shift => (
        <div key={shift.id} className='border p-4 rounded-lg bg-white shadow-sm text-black'>
          <p><b>Valor:</b> R$ {shift.value}</p>

          <p>
            <b>Data:</b>{' '}
            {new Date(shift.start_time).toLocaleString()}
          </p>

          <p>
            <b>Status pagamento:</b>{' '}
            <span className={shift.paid ? 'text-green-600' : 'text-red-600'}>
              {shift.paid ? 'Pago' : 'Não pago'}
            </span>
          </p>
        </div>
      ))}
    </div>
  )
}