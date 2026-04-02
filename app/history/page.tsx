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
      .select('id, value, start_time, end_time, paid, payment_confirmed_by_doctor, missed_by_clinic')
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

  const confirmPayment = async (shift: any) => {
    const { error } = await supabase
      .from('shifts')
      .update({ payment_confirmed_by_doctor: true })
      .eq('id', shift.id)

    if (error) {
      setError(error.message)
      return
    }

    load()
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
            <b>Status:</b>{' '}
            {shift.missed_by_clinic ? (
              <span className='text-red-700 font-semibold'>
                Faltou
              </span>
            ) : (
              <span className={shift.paid ? 'text-green-600' : 'text-yellow-600'}>
                {shift.paid ? 'Pago' : 'Aguardando pagamento'}
              </span>
            )}
          </p>
          {shift.paid && !shift.payment_confirmed_by_doctor && !shift.missed_by_clinic && (
            <button
              onClick={() => confirmPayment(shift)}
              className='mt-2 p-2 bg-green-600 text-white rounded'
            >
              Confirmar recebimento
            </button>
          )}
        </div>
      ))}
    </div>
  )
}