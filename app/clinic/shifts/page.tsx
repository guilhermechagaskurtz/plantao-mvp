/*
app/clinic/shifts/page.tsx
*/
'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { useEffect } from 'react'
import { useRef } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'


export default function CreateShift() {
  const { user, profile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [clinic, setClinic] = useState<any>(null)
  const [shifts, setShifts] = useState<any[]>([])
  const formRef = useRef<HTMLDivElement | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'accepted'>('all')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<'today' | 'future' | 'past'>('today')

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

      if (!clinic) {
        setError('Clínica não encontrada')
        setLoading(false)
        return
      }


      setClinic(clinic)
      await loadShifts(clinic.id)
      setLoading(false)
    }

    load()
  }, [authLoading, user, profile])

  const loadShifts = async (clinicId: string) => {
    const { data, error } = await supabase
      .from('shifts')
      .select(`
    *,
    doctors:accepted_doctor_id (
      id,
      name,
      crm
    )
  `)
      .eq('clinic_id', clinicId)
      .order('status', { ascending: true })
      .order('start_time', { ascending: false })

    if (error) {
      setError(error.message)
      return
    }

    if (data) {
      setShifts(data)
    }
  }



  const deleteShift = async (id: string) => {
    const shift = shifts.find(s => s.id === id)

    if (shift?.status !== 'open') {
      setError('Não é possível remover um plantão já aceito')
      return
    }

    setError('')
    setSuccess('')

    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    setShifts(prev => prev.filter(s => s.id !== id))
    setSuccess('Plantão removido')
  }


  const getTimeLabel = (date: string) => {
    const diffMs = new Date(date).getTime() - new Date().getTime()
    const diffMin = Math.floor(diffMs / 60000)

    // mais de 24h → não mostra nada
    if (diffMin > 1440) return ''

    if (diffMin <= 0) return 'Já começou'
    if (diffMin < 60) return `Começa em ${diffMin} min`

    const hours = Math.floor(diffMin / 60)
    return `Começa em ${hours}h`
  }

  const isToday = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    )
  }

  const matchesTime = (shift: any, type: 'today' | 'future' | 'past') => {
    const d = new Date(shift.start_time)
    const now = new Date()

    if (type === 'today') return isToday(shift.start_time)
    if (type === 'future') return d > now && !isToday(shift.start_time)
    if (type === 'past') return d < now && !isToday(shift.start_time)

    return true
  }

  const countTime = (type: 'today' | 'future' | 'past') =>
    shifts.filter(s => matchesTime(s, type)).length

  const countStatus = (status: 'open' | 'accepted') =>
    shifts.filter(s => s.status === status).length

  return (
    <div ref={formRef} className='flex flex-col gap-X'>
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

      <Card className='mt-6'>
        <div className='flex justify-between items-center mb-3'>
          <h2 className='text-lg font-semibold'>Seus plantões</h2>

          <div className='flex gap-2'>
            <div className='flex gap-2 mr-2'>
              <button
                onClick={() => setTimeFilter('today')}
                className={`px-3 py-1 rounded text-sm ${timeFilter === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
                  }`}
              >
                Hoje ({countTime('today')})
              </button>

              <button
                onClick={() => setTimeFilter('future')}
                className={`px-3 py-1 rounded text-sm ${timeFilter === 'future'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
                  }`}
              >
                Próximos ({countTime('future')})
              </button>

              <button
                onClick={() => setTimeFilter('past')}
                className={`px-3 py-1 rounded text-sm ${timeFilter === 'past'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
                  }`}
              >
                Passados ({countTime('past')})
              </button>
            </div>

            <div className='flex gap-2'>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded text-sm ${statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
                  }`}
              >
                Todos
              </button>

              <button
                onClick={() => setStatusFilter('open')}
                className={`px-3 py-1 rounded text-sm ${statusFilter === 'open'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
                  }`}
              >
                Abertos ({countStatus('open')})
              </button>

              <button
                onClick={() => setStatusFilter('accepted')}
                className={`px-3 py-1 rounded text-sm ${statusFilter === 'accepted'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
                  }`}
              >
                Aceitos ({countStatus('accepted')})
              </button>
            </div>

            <Button
              onClick={() => window.location.href = '/clinic/shifts/create'}
            >
              Novo plantão
            </Button>
          </div>
        </div>
        <div className='text-sm text-gray-500 mb-2'>
          {timeFilter === 'today'
            ? 'Hoje'
            : timeFilter === 'future'
              ? 'Próximos'
              : 'Passados'}
          {' • '}
          {statusFilter === 'all'
            ? 'Todos'
            : statusFilter === 'open'
              ? 'Abertos'
              : 'Aceitos'}
        </div>
        {!loading &&
          shifts.filter(shift => {
            if (statusFilter === 'all') return true
            return shift.status === statusFilter
          }).length === 0 && (
            <div className='text-gray-500'>
              {shifts.length === 0
                ? 'Nenhum plantão criado'
                : 'Nenhum plantão encontrado'}
            </div>
          )}
        {loading && (
          <div className='text-gray-500'>Carregando...</div>
        )}
        <div className='max-h-[500px] overflow-y-auto pr-1'>
          {shifts
            .filter(shift => {
              if (statusFilter !== 'all' && shift.status !== statusFilter) return false

              const d = new Date(shift.start_time)
              const now = new Date()

              const isToday =
                d.getDate() === now.getDate() &&
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()

              if (timeFilter === 'today') return isToday
              if (timeFilter === 'future') return d > now && !isToday
              if (timeFilter === 'past') return d < now && !isToday

              return true
            })
            .sort((a, b) => {
              // prioridade: open primeiro
              if (a.status !== b.status) {
                return a.status === 'open' ? -1 : 1
              }

              // ordena por mais próximo primeiro
              return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            })
            .map(shift => (
              <div
                key={shift.id}
                className='border border-gray-200 p-4 rounded-lg bg-white flex flex-col gap-2'
              >
                <div className='flex justify-between items-center'>
                  <div className='flex flex-col'>
                    <div className='font-semibold text-gray-900'>
                      {shift.specialty}
                    </div>

                    {shift.requires_rqe && (
                      <span className='text-xs text-red-600'>
                        Requer RQE
                      </span>
                    )}
                  </div>

                  <span className={`text-xs font-medium px-2 py-1 rounded 
          ${shift.status === 'open'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'}
        `}>
                    {shift.status === 'open' ? 'Aberto' : 'Aceito'}
                  </span>
                </div>

                <div className='text-sm text-gray-600'>
                  <div><b>Valor:</b> R$ {shift.value}</div>
                  {getTimeLabel(shift.start_time) && (
                    <div className='text-xs text-blue-600 font-medium'>
                      {getTimeLabel(shift.start_time)}
                    </div>
                  )}
                  <div><b>Início:</b> {new Date(shift.start_time).toLocaleString()}</div>
                  <div><b>Fim:</b> {new Date(shift.end_time).toLocaleString()}</div>
                  <div>
                    <b>Local:</b> {shift.address}, {shift.number}
                    {shift.complement ? ` - ${shift.complement}` : ''} - {shift.city}
                  </div>
                </div>

                {shift.status === 'accepted' && shift.doctors && (
                  <div className='text-sm bg-gray-50 p-2 rounded'>
                    <b>Médico:</b> {shift.doctors.name} ({shift.doctors.crm})
                  </div>
                )}

                {shift.status === 'open' && (
                  <div className='flex gap-2 mt-2'>
                    <Button
                      variant='secondary'
                      onClick={() => window.location.href = `/clinic/shifts/${shift.id}/edit`}
                    >
                      Editar
                    </Button>

                    <Button
                      variant='danger'
                      onClick={() => {
                        if (confirmDeleteId === shift.id) {
                          deleteShift(shift.id)
                          setConfirmDeleteId(null)
                        } else {
                          setConfirmDeleteId(shift.id)
                          setTimeout(() => setConfirmDeleteId(null), 3000)
                        }
                      }}
                    >
                      {confirmDeleteId === shift.id ? 'Confirmar?' : 'Excluir'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
        </div>
      </Card>
    </div >
  )
}