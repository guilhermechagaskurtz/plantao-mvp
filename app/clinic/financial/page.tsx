/*
app/clinic/financial/page.tsx
*/
'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function FinancialPage() {
  const { user, profile, loading: authLoading } = useAuth()

  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [doctors, setDoctors] = useState<any[]>([])
  const [doctorSearch, setDoctorSearch] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [confirmMissedId, setConfirmMissedId] = useState<string | null>(null)
  const [confirmPaidId, setConfirmPaidId] = useState<string | null>(null)

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString('pt-BR')

  const getPeriodLabel = () => {
    if (startDate && endDate) return `${startDate} até ${endDate}`
    if (startDate) return `a partir de ${startDate}`
    if (endDate) return `até ${endDate}`
    return 'todo o período'
  }

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
      .order('name', { ascending: true })

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
      .order('paid', { ascending: true })
      .order('start_time', { ascending: false })

    if (startDate) {
      query = query.gte('start_time', startDate)
    }

    if (endDate) {
      query = query.lte('start_time', `${endDate}T23:59:59`)
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
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [authLoading, user, profile])

  const clearFilters = async () => {
    setStartDate('')
    setEndDate('')
    setDoctorSearch('')
    setSelectedDoctor(null)

    if (!user || profile?.type !== 'clinic') return

    setLoading(true)
    setError('')

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
      .order('paid', { ascending: true })
      .order('start_time', { ascending: false })

    const { data, error } = await query

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setShifts(data || [])
    setLoading(false)
  }

  const togglePaid = async (id: string, current: boolean) => {
    setActionLoadingId(id)
    setError('')

    if (current) {
      const { error } = await supabase
        .from('shifts')
        .update({ paid: false })
        .eq('id', id)

      if (error) {
        setError(error.message)
        setActionLoadingId(null)
        return
      }

      await load()
      setActionLoadingId(null)
      return
    }

    const { error } = await supabase.rpc('mark_shift_paid', {
      p_shift_id: id
    })

    if (error) {
      setError(error.message)
      setActionLoadingId(null)
      return
    }

    await load()
    setActionLoadingId(null)
  }

  const markAsMissed = async (shift: any) => {
    setActionLoadingId(shift.id)
    setError('')

    const { error } = await supabase.rpc('mark_shift_missed', {
      p_shift_id: shift.id
    })

    if (error) {
      setError(error.message)
      setActionLoadingId(null)
      return
    }

    await load()
    setActionLoadingId(null)
  }

  const filteredDoctorOptions = doctors.filter((d) =>
    d.name.toLowerCase().includes(doctorSearch.toLowerCase())
  )

  const total = useMemo(
    () => shifts.reduce((acc, s) => acc + Number(s.value), 0),
    [shifts]
  )

  const paidCount = useMemo(
    () => shifts.filter(s => s.paid).length,
    [shifts]
  )

  const pendingCount = useMemo(
    () => shifts.filter(s => !s.paid && !s.missed_by_clinic).length,
    [shifts]
  )

  const missedCount = useMemo(
    () => shifts.filter(s => s.missed_by_clinic).length,
    [shifts]
  )

  if (authLoading) {
    return <div>Carregando...</div>
  }

  return (
    <div className='flex flex-col gap-4'>
      {error && (
        <div className='bg-red-100 text-red-700 p-3 rounded'>
          {error}
        </div>
      )}

      {loading && <div>Carregando...</div>}

      {!loading && (
        <>
          <div className='flex flex-col gap-1'>
            <h1 className='text-2xl font-semibold text-gray-900'>
              Financeiro
            </h1>
            <div className='text-sm text-gray-500'>
              Mostrando {shifts.length} plantão(ões) aceitos em {getPeriodLabel()}
              {selectedDoctor ? ` • Médico: ${selectedDoctor.name}` : ''}
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4'>
            <Card>
              <div className='flex flex-col gap-1'>
                <span className='text-sm text-gray-500'>Total no período</span>
                <span className='text-2xl font-semibold text-gray-900'>
                  {formatCurrency(total)}
                </span>
              </div>
            </Card>

            <Card>
              <div className='flex flex-col gap-1'>
                <span className='text-sm text-gray-500'>Plantões pagos</span>
                <span className='text-2xl font-semibold text-green-700'>
                  {paidCount}
                </span>
              </div>
            </Card>

            <Card>
              <div className='flex flex-col gap-1'>
                <span className='text-sm text-gray-500'>Pendentes de pagamento</span>
                <span className='text-2xl font-semibold text-yellow-700'>
                  {pendingCount}
                </span>
              </div>
            </Card>

            <Card>
              <div className='flex flex-col gap-1'>
                <span className='text-sm text-gray-500'>Faltas marcadas</span>
                <span className='text-2xl font-semibold text-red-700'>
                  {missedCount}
                </span>
              </div>
            </Card>
          </div>

          <Card>
            <div className='flex flex-col gap-4'>
              <div className='flex items-center justify-between gap-3 flex-wrap'>
                <div className='text-lg font-semibold text-gray-900'>
                  Filtros
                </div>

                <div className='text-sm text-gray-500'>
                  {shifts.length} resultado(s)
                </div>
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-3'>
                <div className='relative w-full'>
                  <div className='text-sm text-gray-600 mb-1'>
                    Médico
                  </div>

                  <Input
                    value={doctorSearch}
                    onChange={(v) => {
                      setDoctorSearch(v)
                      setSelectedDoctor(null)
                    }}
                    placeholder='Buscar médico'
                  />

                  {doctorSearch && !selectedDoctor && (
                    <div className='absolute top-full left-0 mt-1 bg-white border border-gray-200 w-full max-h-48 overflow-y-auto z-10 rounded shadow'>
                      {filteredDoctorOptions.length > 0 ? (
                        filteredDoctorOptions.map(d => (
                          <div
                            key={d.id}
                            onClick={() => {
                              setSelectedDoctor(d)
                              setDoctorSearch(d.name)
                            }}
                            className='p-2 hover:bg-gray-100 cursor-pointer text-sm'
                          >
                            {d.name}
                          </div>
                        ))
                      ) : (
                        <div className='p-2 text-sm text-gray-500'>
                          Nenhum médico encontrado
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className='text-sm text-gray-600 mb-1'>
                    Data inicial
                  </div>
                  <Input
                    type='date'
                    value={startDate}
                    onChange={setStartDate}
                  />
                </div>

                <div>
                  <div className='text-sm text-gray-600 mb-1'>
                    Data final
                  </div>
                  <Input
                    type='date'
                    value={endDate}
                    onChange={setEndDate}
                  />
                </div>

                <Button onClick={load}>
                  Filtrar
                </Button>

                <Button
                  variant='secondary'
                  onClick={clearFilters}
                >
                  Limpar filtros
                </Button>
              </div>

              {selectedDoctor && (
                <div className='flex items-center gap-2 flex-wrap'>
                  <span className='text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded'>
                    Médico: {selectedDoctor.name}
                  </span>

                  <button
                    onClick={() => {
                      setSelectedDoctor(null)
                      setDoctorSearch('')
                    }}
                    className='text-xs text-gray-500 hover:text-gray-700'
                  >
                    Remover médico
                  </button>
                </div>
              )}
            </div>
          </Card>

          {shifts.length === 0 ? (
            <Card>
              <div className='text-gray-500'>
                Nenhum plantão encontrado para os filtros selecionados.
              </div>
            </Card>
          ) : (
            <div className='flex flex-col gap-3'>
              {shifts.map(shift => (
                <div
                  key={shift.id}
                  className='border border-gray-200 p-4 rounded-lg bg-white flex flex-col gap-3 hover:shadow-sm transition'
                >
                  <div className='flex justify-between items-start gap-3 flex-wrap'>
                    <div className='flex flex-col gap-1'>
                      <div className='font-semibold text-gray-900'>
                        {shift.doctors?.name || 'Sem médico'}
                      </div>

                      <div className='text-sm text-gray-600'>
                        {formatDateTime(shift.start_time)}
                      </div>
                    </div>

                    <div className='text-right'>
                      <div className='text-sm text-gray-500'>Valor</div>
                      <div className='text-xl font-semibold text-gray-900'>
                        {formatCurrency(Number(shift.value))}
                      </div>
                    </div>
                  </div>

                  <div className='flex gap-2 flex-wrap'>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${shift.paid
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        }`}
                    >
                      {shift.paid ? 'Pago' : 'Não pago'}
                    </span>

                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${shift.finished_by_doctor
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}
                    >
                      {shift.finished_by_doctor
                        ? 'Finalizado pelo médico'
                        : 'Aguardando finalização'}
                    </span>

                    {shift.missed_by_clinic && (
                      <span className='text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700'>
                        Falta marcada
                      </span>
                    )}
                  </div>

                  {!shift.finished_by_doctor && !shift.missed_by_clinic && (
                    <div className='text-xs text-yellow-700'>
                      O pagamento só pode ser confirmado após a finalização do médico.
                    </div>
                  )}

                  {shift.missed_by_clinic && (
                    <div className='text-xs text-red-700'>
                      Este plantão foi marcado como falta pela clínica.
                    </div>
                  )}

                  <div className='flex gap-2 mt-1 flex-wrap'>
                    {new Date(shift.start_time) < new Date() && !shift.missed_by_clinic && (
                      <Button
                        variant='danger'
                        disabled={shift.finished_by_doctor || actionLoadingId === shift.id}
                        onClick={() => {
                          if (confirmMissedId === shift.id) {
                            markAsMissed(shift)
                            setConfirmMissedId(null)
                          } else {
                            setConfirmMissedId(shift.id)
                            setConfirmPaidId(null)
                            setTimeout(() => {
                              setConfirmMissedId(null)
                            }, 3000)
                          }
                        }}
                      >
                        {actionLoadingId === shift.id
                          ? 'Processando...'
                          : confirmMissedId === shift.id
                            ? 'Confirmar falta?'
                            : 'Marcar falta'}
                      </Button>
                    )}

                    <Button
                      variant='secondary'
                      disabled={
                        actionLoadingId === shift.id ||
                        !shift.finished_by_doctor ||
                        shift.missed_by_clinic
                      }
                      onClick={() => {
                        if (confirmPaidId === shift.id) {
                          togglePaid(shift.id, shift.paid)
                          setConfirmPaidId(null)
                        } else {
                          setConfirmPaidId(shift.id)
                          setConfirmMissedId(null)
                          setTimeout(() => {
                            setConfirmPaidId(null)
                          }, 3000)
                        }
                      }}
                    >
                      {actionLoadingId === shift.id
                        ? 'Processando...'
                        : confirmPaidId === shift.id
                          ? shift.paid
                            ? 'Confirmar não pago?'
                            : 'Confirmar pago?'
                          : shift.paid
                            ? 'Marcar como não pago'
                            : 'Marcar como pago'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}