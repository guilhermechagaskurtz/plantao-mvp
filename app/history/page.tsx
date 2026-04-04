/*
app/history/page.tsx
*/
'use client'

import { useEffect, useState } from 'react'
import { useHistoryPage } from '@/hooks/useHistoryPage'

export default function HistoryPage() {
  const {
    shifts,
    loading,
    error,
    confirmPayment,
    setError
  } = useHistoryPage()
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'missed'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const filteredShifts = shifts.filter(shift => {
    if (filter === 'paid' && !shift.paid) return false
    if (filter === 'pending' && (shift.paid || shift.missed_by_clinic)) return false
    if (filter === 'missed' && !shift.missed_by_clinic) return false

    if (startDate && new Date(shift.start_time) < new Date(startDate)) return false
    if (endDate && new Date(shift.start_time) > new Date(endDate)) return false

    return true
  })

  const total = filteredShifts.reduce((acc, s) => acc + Number(s.value), 0)

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-xl font-bold'>Histórico</h1>
      <div className='flex gap-2 flex-wrap'>
        <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
          Todos
        </button>

        <button onClick={() => setFilter('paid')} className={`px-3 py-1 rounded text-sm ${filter === 'paid' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
          Pagos
        </button>

        <button onClick={() => setFilter('pending')} className={`px-3 py-1 rounded text-sm ${filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
          Aguardando
        </button>

        <button onClick={() => setFilter('missed')} className={`px-3 py-1 rounded text-sm ${filter === 'missed' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
          Faltas
        </button>
      </div>
      <div className='flex gap-2 flex-wrap'>
        <input
          type='date'
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className='border p-2 rounded'
        />

        <input
          type='date'
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className='border p-2 rounded'
        />
      </div>
      <div className='bg-white border rounded p-4'>
        <span className='text-sm text-gray-500'>Total no período</span>
        <div className='text-2xl font-semibold text-gray-900'>
          R$ {total.toFixed(2)}
        </div>
      </div>

      {error && <div className='text-red-500'>{error}</div>}

      {loading && <div>Carregando...</div>}

      {!loading && shifts.length === 0 && (
        <div className='text-gray-500'>Nenhum plantão finalizado</div>
      )}

      {!loading && filteredShifts.map(shift => (
        <div key={shift.id} className='border border-gray-200 p-4 rounded-lg bg-white shadow-sm flex flex-col gap-3'>

          <div className='flex justify-between items-center'>
            <div className='text-lg font-semibold text-gray-900'>
              R$ {Number(shift.value).toFixed(2)}
            </div>

            {shift.missed_by_clinic ? (
              <span className='text-xs px-2 py-1 rounded bg-red-100 text-red-700'>
                Faltou
              </span>
            ) : shift.paid ? (
              <span className='text-xs px-2 py-1 rounded bg-green-100 text-green-700'>
                Pago
              </span>
            ) : (
              <span className='text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700'>
                Aguardando
              </span>
            )}
          </div>

          <div className='text-sm text-gray-600 flex flex-col gap-1'>
            <p><b>Clínica:</b> {shift.clinics?.name || '-'}</p>

            <p>
              <b>Endereço:</b>{' '}
              {shift.clinics
                ? `${shift.clinics.address}, ${shift.clinics.number}${shift.clinics.complement ? ' - ' + shift.clinics.complement : ''} - ${shift.clinics.city}/${shift.clinics.state}`
                : '-'}
            </p>

            <p>
              <b>Data:</b> {new Date(shift.start_time).toLocaleString()}
            </p>
          </div>


          {shift.paid && !shift.payment_confirmed_by_doctor && !shift.missed_by_clinic && (
            <button
              onClick={() => confirmPayment(shift)}
              className='p-2 bg-green-600 text-white rounded'
            >
              Confirmar recebimento
            </button>
          )}

        </div>

      ))}
    </div>
  )
}