/*
app/clinic/financial/page.tsx
*/
'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function FinancialPage() {
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [doctors, setDoctors] = useState<any[]>([])
  const [doctorSearch, setDoctorSearch] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)


  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError('')

    const { data: doctorsData } = await supabase
      .from('doctors')
      .select('id, name')

    if (doctorsData) {
      setDoctors(doctorsData)
    }

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) {
      setError('Não autenticado')
      setLoading(false)
      return
    }


    let query = supabase
      .from('shifts')
      .select(`
    id,
    value,
    paid,
    start_time,
    doctors:accepted_doctor_id (
      name
    )
  `)
      .eq('clinic_id', user.id)
      .eq('status', 'accepted')
      .order('start_time', { ascending: false })

    if (startDate) {
      query = query.gte('start_time', startDate)
    }

    if (endDate) {
      query = query.lte('start_time', endDate)
    }

    if (selectedDoctor) {
      query = query.eq('accepted_doctor_id', selectedDoctor.id)
    }

    const { data, error } = await query

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setShifts(data || [])

    const sum = (data || []).reduce((acc, s) => acc + Number(s.value), 0)
    setTotal(sum)

    setLoading(false)
  }

  const togglePaid = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('shifts')
      .update({ paid: !current })
      .eq('id', id)

    if (!error) {
      setShifts(prev =>
        prev.map(s =>
          s.id === id ? { ...s, paid: !current } : s
        )
      )
    }
  }

  return (
    <div className='flex flex-col gap-X'>
      {error && <div className='text-red-500'>{error}</div>}

      {loading && <div>Carregando...</div>}

      {!loading && (
        <>
          <div className='flex gap-2 relative'>

            <div className='relative w-64'>
              <input
                placeholder='Buscar médico'
                value={doctorSearch}
                onChange={e => {
                  setDoctorSearch(e.target.value)
                  setSelectedDoctor(null)
                }}
                className='border p-2 w-full max-w-md'
              />

              {doctorSearch && !selectedDoctor && (
                <div className='absolute bg-white border w-full max-h-40 overflow-y-auto z-10'>
                  {doctors
                    .filter(d =>
                      d.name.toLowerCase().includes(doctorSearch.toLowerCase())
                    )
                    .map(d => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setSelectedDoctor(d)
                          setDoctorSearch(d.name)
                        }}
                        className='p-2 hover:bg-gray-100 cursor-pointer'
                      >
                        {d.name}
                      </div>
                    ))}
                </div>
              )}
            </div>

            <input
              type='date'
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className='border p-2'
            />

            <input
              type='date'
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className='border p-2'
            />

            <button
              onClick={load}
              className='bg-blue-600 text-white px-3'
            >
              Filtrar
            </button>
          </div>
          <div className='font-bold text-lg'>
            Total: R$ {total}
          </div>

          {shifts.map(shift => (
            <div
              key={shift.id}
              className={`border p-3 rounded text-black ${shift.paid ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                }`}
            >
              <p><b>Médico:</b> {shift.doctors?.name}</p>
              <p><b>Valor:</b> R$ {shift.value}</p>
              <p><b>Data:</b> {new Date(shift.start_time).toLocaleString()}</p>
              <p>
                <b>Status:</b>{' '}
                <span className={shift.paid ? 'text-green-600' : 'text-red-600'}>
                  {shift.paid ? 'Pago' : 'Não pago'}
                </span>
              </p>

              <button
                onClick={() => togglePaid(shift.id, shift.paid)}
                className='mt-2 p-2 bg-blue-600 text-white rounded'
              >
                Marcar como {shift.paid ? 'não pago' : 'pago'}
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}