/*
app/clinic/financial/page.tsx
*/
/*
app/clinic/financial/page.tsx
*/
'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function FinancialPage() {
  const { user, profile, loading: authLoading } = useAuth()

  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [doctors, setDoctors] = useState<any[]>([])
  const [doctorSearch, setDoctorSearch] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)

  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    if (authLoading) return

    if (!user || profile?.type !== 'clinic') {
      window.location.href = '/login'
      return
    }

    setLoading(true)
    setError('')

    const { data: doctorsData } = await supabase
      .from('doctors')
      .select('id, name')

    if (doctorsData) {
      setDoctors(doctorsData)
    }

    let query = supabase
      .from('shifts')
      .select(`
        id,
        value,
        paid,
        start_time,
        finished_by_doctor,
        missed_by_clinic,
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

  useEffect(() => {
    load()
  }, [authLoading, user, profile])

  const togglePaid = async (id: string, current: boolean) => {
    setActionLoading(true)
    setError('')

    if (current) {
      const { error } = await supabase
        .from('shifts')
        .update({ paid: false })
        .eq('id', id)

      if (error) {
        setError(error.message)
        setActionLoading(false)
        return
      }

      await load()
      setActionLoading(false)
      return
    }

    const { error } = await supabase.rpc('mark_shift_paid', {
      p_shift_id: id
    })

    if (error) {
      setError(error.message)
      setActionLoading(false)
      return
    }

    await load()
    setActionLoading(false)
  }

  const markAsMissed = async (shift: any) => {
    const { error } = await supabase.rpc('mark_shift_missed', {
      p_shift_id: shift.id
    })

    if (error) {
      setError(error.message)
      return
    }

    await load()
  }

  if (authLoading) {
    return <div>Carregando...</div>
  }

  return (
    <div className='flex flex-col gap-4'>
      {error && <div className='text-red-500'>{error}</div>}

      {loading && <div>Carregando...</div>}

      {!loading && (
        <>
          <Card>
            <div className='flex flex-col gap-4'>
              <div className='text-lg font-semibold text-gray-900'>
                Filtros
              </div>

              <div className='flex flex-col lg:flex-row gap-3'>
                <div className='relative w-full lg:w-64'>
                  <Input
                    value={doctorSearch}
                    onChange={(v) => {
                      setDoctorSearch(v)
                      setSelectedDoctor(null)
                    }}
                    placeholder='Buscar médico'
                  />

                  {doctorSearch && !selectedDoctor && (
                    <div className='absolute bg-white border w-full max-h-40 overflow-y-auto z-10 rounded shadow'>
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

                <Input
                  type='date'
                  value={startDate}
                  onChange={setStartDate}
                />

                <Input
                  type='date'
                  value={endDate}
                  onChange={setEndDate}
                />

                <Button onClick={load}>
                  Filtrar
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className='flex flex-col'>
              <span className='text-sm text-gray-500'>
                Total no período
              </span>

              <span className='text-2xl font-semibold text-gray-900'>
                R$ {total}
              </span>
            </div>
          </Card>

          {shifts.map(shift => (
            <div
              key={shift.id}
              className='border border-gray-200 p-4 rounded-lg bg-white flex flex-col gap-2 hover:shadow-sm transition'
            >
              <div className='flex justify-between items-center'>
                <div className='font-semibold text-gray-900'>
                  {shift.doctors?.name || 'Sem médico'}
                </div>

                <span className={`text-xs font-medium px-2 py-1 rounded ${shift.paid
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                  }`}>
                  {shift.paid ? 'Pago' : 'Não pago'}
                </span>
              </div>

              <div className='text-sm text-gray-600'>
                <div><b>Valor:</b> R$ {shift.value}</div>
                <div><b>Data:</b> {new Date(shift.start_time).toLocaleString()}</div>
              </div>

              {!shift.finished_by_doctor && (
                <div className='text-xs text-yellow-700'>
                  Aguardando médico finalizar
                </div>
              )}

              {shift.missed_by_clinic && (
                <div className='text-xs text-red-700 font-medium'>
                  Médico faltou
                </div>
              )}

              <div className='flex gap-2 mt-2 flex-wrap'>
                {new Date(shift.start_time) < new Date() && !shift.missed_by_clinic && (
                  <Button
                    variant='danger'
                    disabled={shift.finished_by_doctor}
                    onClick={() => markAsMissed(shift)}
                  >
                    Marcar falta
                  </Button>
                )}

                <Button
                  variant='secondary'
                  disabled={
                    actionLoading ||
                    !shift.finished_by_doctor ||
                    shift.missed_by_clinic
                  }
                  onClick={() => togglePaid(shift.id, shift.paid)}
                >
                  {shift.paid ? 'Marcar como não pago' : 'Marcar como pago'}
                </Button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}