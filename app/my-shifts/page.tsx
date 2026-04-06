/*
app/my-shifts/page.tsx
*/
'use client'

import { useEffect, useState } from 'react'
import { useMyShiftsPage } from '@/hooks/useMyShiftsPage'

export default function MyShiftsPage() {
  const {
    shifts,
    loading,
    error,
    doctor,
    cancelShift,
    finishShift,
    setError
  } = useMyShiftsPage()
  const [filter, setFilter] = useState<'all' | 'future' | 'ongoing' | 'past'>('all')

  const filteredShifts = shifts.filter(shift => {
    const now = new Date()
    const start = new Date(shift.start_time)
    const end = new Date(shift.end_time)

    if (filter === 'future') return start > now
    if (filter === 'ongoing') return start <= now && end > now
    if (filter === 'past') return end <= now

    return true
  })

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-xl font-bold'>Meus plantões</h1>
      <div className='flex gap-2 flex-wrap'>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Todos
        </button>

        <button
          onClick={() => setFilter('future')}
          className={`px-3 py-1 rounded text-sm ${filter === 'future' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Futuros
        </button>

        <button
          onClick={() => setFilter('ongoing')}
          className={`px-3 py-1 rounded text-sm ${filter === 'ongoing' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Em andamento
        </button>

        <button
          onClick={() => setFilter('past')}
          className={`px-3 py-1 rounded text-sm ${filter === 'past' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Finalizados
        </button>
      </div>

      {error && (
        <div className='bg-red-100 text-red-700 p-2 rounded'>
          {error}
        </div>
      )}

      {loading && <div>Carregando...</div>}

      {!loading && shifts.length === 0 && (
        <div className='text-gray-500'>Nenhum plantão futuro</div>
      )}

      {!loading && filteredShifts.map(shift => (
        <div
          key={shift.id}
          className={`border border-gray-200 p-4 bg-white rounded-lg shadow-sm flex flex-col gap-3`}
        >
          {/* HEADER */}
          <div className='flex justify-between items-center'>
            <div className='font-semibold text-gray-900'>
              {shift.specialty}
            </div>

            <span className={`text-xs font-medium px-2 py-1 rounded 
      ${new Date(shift.start_time) > new Date()
                ? 'bg-blue-100 text-blue-700'
                : new Date(shift.end_time) > new Date()
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-200 text-gray-700'
              }
    `}>
              {new Date(shift.start_time) > new Date()
                ? 'Futuro'
                : new Date(shift.end_time) > new Date()
                  ? 'Em andamento'
                  : 'Finalizado'
              }
            </span>
          </div>

          {/* VALOR */}
          <div className='text-lg font-semibold text-gray-900'>
            R$ {Number(shift.value).toFixed(2)}
          </div>

          {/* INFO */}
          <div className='text-sm text-gray-600 flex flex-col gap-1'>
            <p><b>Clínica:</b> {shift.clinics?.name || '-'}</p>

            <p>
              <b>Endereço:</b>{' '}
              {shift.clinics
                ? `${shift.clinics.address}, ${shift.clinics.number}${shift.clinics.complement ? ' - ' + shift.clinics.complement : ''} - ${shift.clinics.city}/${shift.clinics.state}`
                : '-'}
            </p>

            <p>
              <b>Início:</b>{' '}
              {new Date(shift.start_time).toLocaleString()}
            </p>

            <p>
              <b>Fim:</b>{' '}
              {new Date(shift.end_time).toLocaleString()}
            </p>
          </div>

          {/* MAPS */}
          <a
            href={`https://www.google.com/maps?q=${shift.latitude},${shift.longitude}`}
            target='_blank'
            rel='noopener noreferrer'
            className='text-sm text-blue-600 hover:underline'
          >
            Ver no Google Maps
          </a>

          {/* AÇÕES */}
          <div className='flex gap-2 mt-2'>
            {new Date(shift.start_time) > new Date() && (
              <button
                onClick={() => cancelShift(shift)}
                className='p-2 bg-red-600 text-white rounded'
              >
                Cancelar
              </button>
            )}

            {new Date(shift.end_time) <= new Date() &&
              !shift.finished_by_doctor &&
              !shift.missed_by_clinic && (
                <button
                  onClick={() => finishShift(shift)}
                  className='p-2 bg-blue-600 text-white rounded'
                >
                  Finalizar
                </button>
              )}
          </div>
        </div>
      ))}
    </div>
  )
}