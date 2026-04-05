/*
app/shifts/page.tsx
*/
'use client'

import dynamic from 'next/dynamic'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { SPECIALTIES } from '@/lib/specialties'
import { useShiftsPage } from '@/hooks/useShiftsPage'
import { supabase } from '@/lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { getDistanceKm } from '@/lib/utils/distance'
import { useRouter } from 'next/navigation'

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false
})


export default function ShiftsPage() {
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)
  const [specialtyFilter, setSpecialtyFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [debouncedLocation, setDebouncedLocation] = useState('')
  const [preferences, setPreferences] = useState<any>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const [onlyUrgent, setOnlyUrgent] = useState(false)
  const isTyping = locationFilter !== debouncedLocation
  const router = useRouter()
  const {
    shifts,
    loading,
    error,
    success,
    doctor,
    acceptingId,
    crmStatus,
    approvedSpecialties,
    acceptShift,
    setError,
    setSuccess
  } = useShiftsPage()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLocation(locationFilter)
    }, 300)

    return () => clearTimeout(timer)
  }, [locationFilter])

  useEffect(() => {
    const loadPreferences = async () => {
      if (!doctor?.id) return

      const { data } = await supabase
        .from('doctor_notification_preferences')
        .select('*')
        .eq('doctor_id', doctor.id)
        .maybeSingle()

      setPreferences(data)
    }

    loadPreferences()
  }, [doctor?.id])

  useEffect(() => {
    if (!error && !success) return

    const timer = setTimeout(() => {
      setError('')
      setSuccess('')
    }, 3000)

    return () => clearTimeout(timer)
  }, [error, success])

  useEffect(() => {
    if (!selectedShiftId || !listRef.current) return

    const el = listRef.current.querySelector(`[data-id="${selectedShiftId}"]`)
    if (el) {
      el.classList.add('ring-2', 'ring-blue-400')

      el.scrollIntoView({ behavior: 'smooth', block: 'center' })

      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-blue-400')
      }, 1000)
    }
  }, [selectedShiftId])

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
      {loading && (
        <div className='text-gray-500 text-sm flex items-center gap-2'>
          <span className='animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full'></span>
          Carregando plantões...
        </div>
      )}

      {!loading && (
        <div className="flex flex-col lg:flex-row gap-6">

          {/* MAPA */}
          <div className="w-full lg:w-2/5 sticky top-4 h-fit">
            <Map
              shifts={shifts}
              selectedShiftId={selectedShiftId}
              onSelect={setSelectedShiftId}
              centerLat={preferences?.latitude}
              centerLng={preferences?.longitude}
              radiusKm={preferences?.radius_km}
            />
          </div>

          {/* LISTA */}
          <div className="w-full lg:w-3/5 flex flex-col gap-3">

            <div className='text-sm text-gray-600'>
              {preferences?.latitude && preferences?.longitude
                ? 'Selecione um plantão no mapa ou na lista para ver detalhes e aceitar'
                : 'Defina sua localização nas preferências para ver plantões próximos de você'}
            </div>
            {/* FILTROS */}
            <label className='flex items-center gap-1 text-sm cursor-pointer'>
              <input
                type='checkbox'
                checked={onlyUrgent}
                onChange={e => setOnlyUrgent(e.target.checked)}
              />
              Urgentes (até 6h)
            </label>
            <div className='flex gap-2 flex-wrap items-center'>
              <select
                value={specialtyFilter}
                onChange={e => setSpecialtyFilter(e.target.value)}
                className={`p-2 border rounded ${specialtyFilter
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300'
                  }`}
              >
                <option value=''>Todas especialidades</option>
                {SPECIALTIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <div className='relative max-w-xs w-full'>
                <Input
                  value={locationFilter}
                  onChange={setLocationFilter}
                  placeholder='Buscar por clínica, cidade ou endereço'
                  className='pr-8'
                />

                {locationFilter && (
                  <button
                    onClick={() => {
                      setLocationFilter('')
                      setDebouncedLocation('')
                    }}
                    className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  >
                    ✕
                  </button>
                )}
              </div>
              {isTyping && (
                <span className='text-xs text-gray-400'>Filtrando...</span>
              )}
            </div>

            <div className="text-xs text-gray-500">
              {preferences?.latitude && preferences?.longitude
                ? 'Ordenado por proximidade'
                : 'Ordenação padrão (defina sua localização para ver por proximidade)'}
            </div>
            {/* LISTA SCROLL */}
            <div ref={listRef} className="flex flex-col gap-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">


              {(() => {
                const filteredShifts = [...shifts]
                  .filter(shift => {
                    if (onlyUrgent) {
                      const start = new Date(shift.start_time).getTime()
                      const now = Date.now()
                      const diffHours = (start - now) / (1000 * 60 * 60)

                      if (!(diffHours <= 6 && diffHours > 0)) return false
                    }
                    if (specialtyFilter && shift.specialty !== specialtyFilter) return false

                    if (debouncedLocation) {
                      const text = `${shift.clinics?.name || ''} ${shift.clinics?.address || ''} ${shift.clinics?.city || ''} ${shift.clinics?.state || ''}`.toLowerCase()
                      if (!text.includes(debouncedLocation.toLowerCase())) return false
                    }

                    return true
                  })
                  .sort((a, b) => {
                    if (!preferences?.latitude || !preferences?.longitude) return 0

                    const distA = getDistanceKm(
                      preferences.latitude,
                      preferences.longitude,
                      a.latitude,
                      a.longitude
                    )

                    const distB = getDistanceKm(
                      preferences.latitude,
                      preferences.longitude,
                      b.latitude,
                      b.longitude
                    )

                    return distA - distB
                  })

                return (
                  <>
                    <div className="text-xs text-gray-500">
                      {filteredShifts.length} resultado(s)
                    </div>
                    {filteredShifts.length === 0 && (
                      <div className='text-gray-500'>
                        {shifts.length === 0
                          ? 'Nenhum plantão disponível'
                          : 'Nenhum resultado para os filtros aplicados'}
                      </div>
                    )}

                    {filteredShifts.map(shift => (
                      <div
                        key={shift.id}
                        data-id={shift.id}
                        onClick={() => setSelectedShiftId(shift.id)}
                        className={`p-4 bg-white rounded-lg cursor-pointer border transition
          ${selectedShiftId === shift.id
                            ? 'border-2 border-blue-600 shadow-md'
                            : 'border-gray-200 hover:border-gray-400'}
          `}
                      >
                        {(() => {
                          const start = new Date(shift.start_time).getTime()
                          const now = Date.now()
                          const diffHours = (start - now) / (1000 * 60 * 60)

                          if (diffHours <= 6 && diffHours > 0) {
                            return (
                              <div className='text-xs bg-red-100 text-red-700 px-2 py-1 rounded mb-2 w-fit'>
                                Começa em breve
                              </div>
                            )
                          }

                          return null
                        })()}
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

                          <span className='text-xs bg-blue-100 px-2 py-1 rounded'>
                            Disponível
                          </span>
                        </div>

                        <div className='text-lg font-semibold'>
                          {Number(shift.value).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </div>

                        <div className='text-sm text-gray-600 flex flex-col gap-1'>
                          <p><b>Clínica:</b> {shift.clinics?.name || '-'}</p>

                          <p className='text-gray-500 text-xs'>
                            <b>Endereço:</b>{' '}
                            {shift.clinics
                              ? `${shift.clinics.address}, ${shift.clinics.number}${shift.clinics.complement ? ' - ' + shift.clinics.complement : ''
                              } - ${shift.clinics.city}/${shift.clinics.state}`
                              : '-'}
                          </p>

                          <p>
                            <b>Início:</b> {new Date(shift.start_time).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>

                          <p>
                            <b>Fim:</b> {new Date(shift.end_time).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>

                          {preferences?.latitude && preferences?.longitude && (
                            <p>
                              <b>Distância:</b>{' '}
                              {Math.round(
                                getDistanceKm(
                                  preferences.latitude,
                                  preferences.longitude,
                                  shift.latitude,
                                  shift.longitude
                                )
                              )} km
                            </p>
                          )}
                        </div>

                        <div className='flex gap-2 mt-2'>
                          <Button
                            disabled={
                              acceptingId === shift.id ||
                              shift.accepted_doctor_id ||
                              crmStatus !== 'ok' ||
                              (shift.requires_rqe && !approvedSpecialties.includes(shift.specialty))
                            }
                            onClick={(e) => {
                              e.stopPropagation()
                              acceptShift(shift)
                            }}
                          >
                            {shift.accepted_doctor_id
                              ? 'Aceito'
                              : acceptingId === shift.id
                                ? 'Aceitando...'
                                : 'Aceitar'}
                          </Button>

                          <Button
                            variant='secondary'
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/shifts/${shift.id}`)
                            }}
                          >
                            Ver detalhes
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )
              })()}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}