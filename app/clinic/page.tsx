/*
app/clinic/page.tsx
*/
'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Shift = {
  id: string
  specialty: string
  start_time: string
  value: number
  status: string
  paid: boolean
  ready_for_payment: boolean
  finished_by_doctor: boolean
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getLocalDateKey(date: Date) {
  return date.toISOString().split('T')[0]
}

export default function ClinicDashboard() {
  const { user, profile, loading: authLoading } = useAuth()

  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])

  useEffect(() => {
    if (authLoading) return

    if (!user || profile?.type !== 'clinic') {
      window.location.href = '/login'
      return
    }

    const load = async () => {
      setLoading(true)

      const { data } = await supabase
        .from('shifts')
        .select('*')
        .eq('clinic_id', user.id)
        .is('deleted_at', null)

      setShifts(data || [])
      setLoading(false)
    }

    load()
  }, [authLoading, user, profile])

  const specialties = useMemo(() => {
    return Array.from(new Set(shifts.map(s => s.specialty)))
  }, [shifts])

  const filteredShifts = useMemo(() => {
    if (selectedSpecialties.length === 0) return shifts
    return shifts.filter(s => selectedSpecialties.includes(s.specialty))
  }, [shifts, selectedSpecialties])

  const grouped = useMemo(() => {
    const map: Record<string, Shift[]> = {}

    filteredShifts.forEach(item => {
      const key = getLocalDateKey(new Date(item.start_time))
      if (!map[key]) map[key] = []
      map[key].push(item)
    })

    return map
  }, [filteredShifts])

  const stats = useMemo(() => {
    return {
      open: shifts.filter(s => s.status === 'open').length,
      accepted: shifts.filter(s => s.status === 'accepted').length,
      finished: shifts.filter(s => s.finished_by_doctor).length,
      toPay: shifts
        .filter(s => s.ready_for_payment)
        .reduce((acc, s) => acc + (s.value || 0), 0),
      paid: shifts
        .filter(s => s.paid)
        .reduce((acc, s) => acc + (s.value || 0), 0)
    }
  }, [shifts])

  const upcoming = useMemo(() => {
    const now = new Date()
    return shifts
      .filter(s => new Date(s.start_time) > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 5)
  }, [shifts])

  if (authLoading || loading) {
    return <div className='p-6'>Carregando...</div>
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()

  const cells = []

  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} />)
  }

  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month, d)
    const key = getLocalDateKey(date)
    const items = grouped[key] || []
    const hasItems = items.length > 0

    cells.push(
      <div
        key={d}
        className={`group border rounded-lg p-2 min-h-[100px] transition relative ${hasItems ? 'bg-white hover:bg-gray-50' : 'bg-green-50'
          }`}
      >
        <div className='flex justify-between items-start'>
          <div className='text-sm font-semibold'>{d}</div>

          <button
            onClick={() => (window.location.href = '/clinic/shifts/create')}
            className='text-xs bg-blue-600 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition'
          >
            Criar
          </button>
        </div>

        {items.slice(0, 3).map(item => (
          <div
            key={item.id}
            onClick={() => (window.location.href = `/clinic/shifts/${item.id}/edit`)}
            className={`text-xs mt-1 px-1 rounded cursor-pointer ${item.status === 'accepted'
                ? 'bg-blue-200'
                : 'bg-gray-200'
              }`}
          >
            {new Date(item.start_time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}{' '}
            {item.specialty}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className='p-4 md:p-6 bg-gray-50 min-h-screen flex flex-col gap-6'>

      <h1 className='text-xl font-bold'>Dashboard</h1>

      {/* RESUMO */}
      <div className='grid grid-cols-2 md:grid-cols-5 gap-3'>
        <Card title='Abertos' value={stats.open} />
        <Card title='Aceitos' value={stats.accepted} />
        <Card title='Finalizados' value={stats.finished} />
        <Card title='A pagar' value={`R$ ${stats.toPay}`} />
        <Card title='Pago' value={`R$ ${stats.paid}`} />
      </div>

      {/* AÇÕES */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
        <a href='/clinic/shifts' className='bg-blue-600 hover:bg-blue-700 text-white font-semibold p-3 rounded-lg text-center'>
          Gerenciar plantões
        </a>
        <a href='/clinic/financial' className='bg-green-600 hover:bg-green-700 text-white font-semibold p-3 rounded-lg text-center'>
          Financeiro
        </a>
        <a href='/clinic/shifts/create' className='bg-purple-600 hover:bg-purple-700 text-white font-semibold p-3 rounded-lg text-center'>
          Criar plantão
        </a>
      </div>

      {/* PRÓXIMOS */}
      <div className='bg-white rounded-xl border shadow-sm p-4'>
        <h2 className='font-bold mb-3'>Próximos plantões</h2>

        {upcoming.map(s => (
          <div
            key={s.id}
            onClick={() => (window.location.href = `/clinic/shifts/${s.id}/edit`)}
            className='flex justify-between items-center border-b py-2 cursor-pointer hover:bg-gray-50 rounded'
          >
            <div>
              <div className='text-sm font-medium'>{s.specialty}</div>
              <div className='text-xs text-gray-500'>
                {new Date(s.start_time).toLocaleString()}
              </div>
            </div>

            <div className='text-xs px-2 py-1 rounded bg-gray-100'>
              {s.status}
            </div>
          </div>
        ))}
      </div>

      {/* FILTRO */}
      <div className='flex justify-end'>
        <button
          onClick={() => setFilterOpen(true)}
          className='bg-gray-800 text-white px-3 py-2 rounded'
        >
          Filtrar especialidades
        </button>
      </div>

      {/* CALENDÁRIO */}
      <div className='bg-white rounded-xl border shadow-sm p-4'>
        <h2 className='font-bold mb-3'>Calendário</h2>

        <div className='grid grid-cols-7 gap-1 md:gap-2 text-xs md:text-sm'>
          {WEEK_DAYS.map(d => (
            <div key={d} className='text-center font-semibold'>{d}</div>
          ))}
          {cells}
        </div>
      </div>

      {/* MODAL */}
      {filterOpen && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center'>
          <div className='bg-white p-6 rounded-xl w-full max-w-sm flex flex-col gap-4'>
            <h2 className='font-bold'>Filtrar especialidades</h2>

            {specialties.map(s => (
              <label key={s} className='flex gap-2'>
                <input
                  type='checkbox'
                  checked={selectedSpecialties.includes(s)}
                  onChange={() =>
                    setSelectedSpecialties(prev =>
                      prev.includes(s)
                        ? prev.filter(i => i !== s)
                        : [...prev, s]
                    )
                  }
                />
                {s}
              </label>
            ))}

            <div className='flex gap-2'>
              <button
                onClick={() => setSelectedSpecialties([])}
                className='flex-1 bg-gray-200 p-2 rounded'
              >
                Limpar
              </button>

              <button
                onClick={() => setFilterOpen(false)}
                className='flex-1 bg-blue-600 text-white p-2 rounded'
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div className='bg-white rounded-xl border shadow-sm p-4 flex flex-col'>
      <span className='text-xs text-gray-500'>{title}</span>
      <span className='text-2xl font-bold'>{value}</span>
    </div>
  )
}