/*
app/shifts/page.tsx
*/
'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { SPECIALTIES } from '@/lib/specialties'

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false
})

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [doctor, setDoctor] = useState<any>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)
  const [specialtyFilter, setSpecialtyFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [crmStatus, setCrmStatus] = useState<'ok' | 'missing' | 'pending' | 'rejected'>('ok')
  const [approvedSpecialties, setApprovedSpecialties] = useState<string[]>([])

  useEffect(() => {
    if (!error && !success) return

    const timer = setTimeout(() => {
      setError('')
      setSuccess('')
    }, 3000)

    return () => clearTimeout(timer)
  }, [error, success])

  const loadShifts = async () => {
    setLoading(true)
    setError('')

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) return

    const { data: doctor } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', user.id)
      .single()

    setDoctor(doctor)
    const { data: specialties } = await supabase
      .from('doctor_specialties')
      .select('*')
      .eq('doctor_id', user.id)

    setApprovedSpecialties(
      (specialties || [])
        .filter(s => s.approved)
        .map(s => s.specialty)
    )
    if (!doctor?.crm) {
      setCrmStatus('missing')
    } else if (!doctor?.crm_approved) {
      if (doctor?.crm_rejection_reason) {
        setCrmStatus('rejected')
      } else {
        setCrmStatus('pending')
      }
    } else {
      setCrmStatus('ok')
    }

    const { data, error } = await supabase
      .from('shifts')
      .select(`
        *,
        clinics:clinic_id (
          name,
          address,
          number,
          complement,
          city,
          state
        )
      `)
      .eq('status', 'open')
      .gt('start_time', new Date().toISOString())

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const filtered = (data || []).filter(shift => {
      if (!doctor?.latitude || !doctor?.longitude) return true

      const dist = getDistanceKm(
        doctor.latitude,
        doctor.longitude,
        shift.latitude,
        shift.longitude
      )

      return dist <= (doctor.radius_km || 10)
    })

    const sorted = filtered.sort((a, b) => {
      const distA = getDistanceKm(
        doctor?.latitude,
        doctor?.longitude,
        a.latitude,
        a.longitude
      )

      const distB = getDistanceKm(
        doctor?.latitude,
        doctor?.longitude,
        b.latitude,
        b.longitude
      )

      return distA - distB
    })

    setShifts(sorted)
    setLoading(false)
  }

  useEffect(() => {
    loadShifts()
  }, [])

  const acceptShift = async (shift: any) => {
    const confirmed = window.confirm('Deseja aceitar este plantão?')

    if (!confirmed) return

    setAcceptingId(shift.id)

    const { data } = await supabase.auth.getUser()
    const user = data.user

    if (!user) return

    const { error } = await supabase.rpc('accept_shift', {
      p_shift_id: shift.id,
      p_doctor_id: user.id
    })

    if (error) {
      if (error.message.includes('Conflito')) {
        setError('Você já possui um plantão neste horário')
      } else if (error.message.includes('RQE')) {
        setError('Você não possui RQE aprovado para este plantão')
      } else if (error.message.includes('Shift inválido')) {
        setError('Este plantão não está mais disponível')
      } else {
        setError('Erro ao aceitar plantão')
      }

      setAcceptingId(null)
      return
    }

    setShifts(prev => prev.filter(s => s.id !== shift.id))
    setSuccess('Plantão aceito')
    setAcceptingId(null)
  }

  return (
    <div className='flex flex-col gap-4'>
      {crmStatus === 'missing' && (
        <div className='bg-yellow-100 text-yellow-700 p-2 rounded'>
          Você precisa preencher seu CRM no perfil para aceitar plantões
        </div>
      )}

      {crmStatus === 'pending' && (
        <div className='bg-yellow-100 text-yellow-700 p-2 rounded'>
          Seu CRM está em análise pelo administrador
        </div>
      )}

      {crmStatus === 'rejected' && (
        <div className='bg-red-100 text-red-700 p-2 rounded'>
          Seu CRM foi recusado. Atualize seu perfil para reenviar
        </div>
      )}
      {error && <div className='bg-red-100 text-red-700 p-2 rounded'>{error}</div>}
      {success && <div className='bg-green-100 text-green-700 p-2 rounded'>{success}</div>}
      {loading && <div className='text-gray-500'>Carregando...</div>}

      {!loading && (
        <div className="flex flex-col lg:flex-row gap-6">

          {/* MAPA */}
          <div className="w-full lg:w-2/5 sticky top-4 h-fit">
            <Map
              shifts={shifts}
              selectedShiftId={selectedShiftId}
              onSelect={setSelectedShiftId}
            />
          </div>

          {/* LISTA */}
          <div className="w-full lg:w-3/5 flex flex-col gap-3">

            {/* FILTROS */}
            <div className='flex gap-2 flex-wrap'>
              <select
                value={specialtyFilter}
                onChange={e => setSpecialtyFilter(e.target.value)}
                className='p-2 border rounded'
              >
                <option value=''>Todas especialidades</option>
                {SPECIALTIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <Input
                value={locationFilter}
                onChange={setLocationFilter}
                placeholder='Buscar por cidade ou endereço'
                className='max-w-xs'
              />
            </div>

            {/* LISTA SCROLL */}
            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">

              {shifts.length === 0 && (
                <div className='text-gray-500'>
                  Nenhum plantão dentro do seu raio
                </div>
              )}
              {shifts
                .filter(shift => {
                  if (specialtyFilter && shift.specialty !== specialtyFilter) return false

                  if (locationFilter) {
                    const text = `${shift.clinics?.address || ''} ${shift.clinics?.city || ''} ${shift.clinics?.state || ''}`.toLowerCase()
                    if (!text.includes(locationFilter.toLowerCase())) return false
                  }

                  return true
                })
                .map(shift => (
                  <div
                    key={shift.id}
                    onClick={() => setSelectedShiftId(shift.id)}
                    className={`p-4 bg-white rounded-lg cursor-pointer border transition
                    ${selectedShiftId === shift.id
                        ? 'border-blue-600 shadow-md'
                        : 'border-gray-200 hover:border-gray-400'}
                    `}
                  >
                    <div className='flex justify-between'>
                      <div className='font-semibold'>{shift.specialty}</div>
                      {shift.requires_rqe && (
                        <div
                          className={`text-xs ${approvedSpecialties.includes(shift.specialty)
                            ? 'text-green-600'
                            : 'text-red-600'
                            }`}
                        >
                          {approvedSpecialties.includes(shift.specialty)
                            ? `Você possui RQE aprovado em ${shift.specialty}`
                            : `Você não possui RQE aprovado em ${shift.specialty}`}
                        </div>
                      )}
                      <span className='text-xs bg-blue-100 px-2 py-1 rounded'>Disponível</span>
                    </div>

                    <div className='text-lg font-semibold'>
                      R$ {Number(shift.value).toFixed(2)}
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
                        <b>Início:</b> {new Date(shift.start_time).toLocaleString()}
                      </p>

                      <p>
                        <b>Fim:</b> {new Date(shift.end_time).toLocaleString()}
                      </p>

                      <p>
                        <b>Distância:</b>{' '}
                        {Math.round(
                          getDistanceKm(
                            doctor?.latitude,
                            doctor?.longitude,
                            shift.latitude,
                            shift.longitude
                          )
                        )} km
                      </p>
                    </div>

                    <div className='flex gap-2 mt-2'>
                      <Button
                        disabled={
                          acceptingId === shift.id ||
                          crmStatus !== 'ok' ||
                          (shift.requires_rqe && !approvedSpecialties.includes(shift.specialty))
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          acceptShift(shift)
                        }}
                      >
                        {acceptingId === shift.id ? 'Aceitando...' : 'Aceitar'}
                      </Button>

                      <Button
                        variant='secondary'
                        onClick={(e) => {
                          e.stopPropagation()
                          window.location.href = `/shifts/${shift.id}`
                        }}
                      >
                        Ver detalhes
                      </Button>
                    </div>
                  </div>
                ))}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}