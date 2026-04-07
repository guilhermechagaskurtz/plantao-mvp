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
import { getIsPremium } from '@/lib/services/premium'

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
  const [isPremium, setIsPremium] = useState(false)
  const [minValueFilter, setMinValueFilter] = useState('')
  const [maxDistanceFilter, setMaxDistanceFilter] = useState('')
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
    const loadPremium = async () => {
      if (!doctor?.id) return

      const premium = await getIsPremium(doctor.id)
      setIsPremium(premium)
    }

    loadPremium()
  }, [doctor?.id])

  useEffect(() => {
    const handler = (e: any) => {
      setIsPremium(e.detail)
    }

    window.addEventListener('premium-changed', handler)

    return () => {
      window.removeEventListener('premium-changed', handler)
    }
  }, [])

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

  
  // === CENTRO DO MAPA (premium vs free) ===
  const getMapCenter = () => {
    if (isPremium && preferences?.latitude && preferences?.longitude) {
      return {
        lat: preferences.latitude,
        lng: preferences.longitude,
        radius: preferences.radius_km || 5
      }
    }

    if (shifts.length === 0) {
      return { lat: undefined, lng: undefined, radius: undefined }
    }

    const validShifts = shifts.filter(s => s.latitude && s.longitude)

    if (validShifts.length === 0) {
      return { lat: undefined, lng: undefined, radius: undefined }
    }

    const avgLat =
      validShifts.reduce((sum, s) => sum + s.latitude, 0) /
      validShifts.length

    const avgLng =
      validShifts.reduce((sum, s) => sum + s.longitude, 0) /
      validShifts.length

    return {
      lat: avgLat,
      lng: avgLng,
      radius: undefined
    }
  }

  const mapCenter = getMapCenter()
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
          <div className="w-full lg:w-2/5 
              h-[300px] 
              lg:h-[calc(100vh-100px)] 
              lg:sticky lg:top-4 
              overflow-hidden rounded-lg border">
            <Map
              shifts={shifts}
              selectedShiftId={selectedShiftId}
              onSelect={setSelectedShiftId}
              centerLat={mapCenter.lat}
              centerLng={mapCenter.lng}
              radiusKm={mapCenter.radius}
            />
          </div>

          {/* LISTA */}
          <div className="w-full lg:w-3/5 flex flex-col gap-3">
            {/* FILTROS */}
            <div className='flex flex-col gap-3'>

              {/* LINHA 1 */}
              <div className='flex flex-wrap gap-2 items-center'>

                <label className='flex items-center gap-1 text-sm cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={onlyUrgent}
                    onChange={e => setOnlyUrgent(e.target.checked)}
                  />
                  Urgentes (até 24h)
                </label>

                <select
                  value={specialtyFilter}
                  onChange={e => setSpecialtyFilter(e.target.value)}
                  className='p-2 border rounded text-sm bg-white'
                >
                  <option value=''>Todas especialidades</option>
                  {SPECIALTIES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <div className='relative w-full sm:max-w-xs'>
                  <Input
                    value={locationFilter}
                    onChange={setLocationFilter}
                    placeholder='Buscar clínica ou cidade'
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

              </div>

              {/* LINHA PREMIUM */}
              {isPremium && (
                <div className='flex flex-wrap gap-2 items-center bg-yellow-50 border border-yellow-200 p-2 rounded-md'>

                  <span className='text-xs text-yellow-700 font-medium'>
                    Filtros avançados
                  </span>

                  <Input
                    value={minValueFilter}
                    onChange={setMinValueFilter}
                    placeholder='Valor mín.'
                    className='w-[120px]'
                  />

                  <Input
                    value={maxDistanceFilter}
                    onChange={setMaxDistanceFilter}
                    placeholder='Distância máx'
                    className='w-[140px]'
                  />

                </div>
              )}

            </div>
            {isTyping && (
              <span className='text-xs text-gray-400'>Filtrando...</span>
            )}

            {isPremium && preferences?.latitude && preferences?.longitude && (
              <div className="text-xs text-gray-500">
                Ordenado por proximidade
              </div>
            )}
            {/* LISTA SCROLL */}
            <div ref={listRef} className="flex flex-col gap-3 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto pr-1">


              {(() => {
                const filteredBase = [...shifts].filter(shift => {
                  if (onlyUrgent) {
                    const start = new Date(shift.start_time).getTime()
                    const now = Date.now()
                    const diffHours = (start - now) / (1000 * 60 * 60)

                    if (!(diffHours <= 24 && diffHours > 0)) return false
                  }

                  if (specialtyFilter && shift.specialty !== specialtyFilter) return false

                  if (debouncedLocation) {
                    const text = `${shift.clinics?.name || ''} ${shift.clinics?.address || ''} ${shift.clinics?.city || ''} ${shift.clinics?.state || ''}`.toLowerCase()
                    if (!text.includes(debouncedLocation.toLowerCase())) return false
                  }

                  // filtro por valor mínimo
                  if (minValueFilter) {
                    const minValue = Number(minValueFilter)
                    if (Number(shift.value) < minValue) return false
                  }

                  // filtro por distância
                  if (isPremium && maxDistanceFilter && preferences?.latitude && preferences?.longitude) {
                    const maxDist = Number(maxDistanceFilter)

                    const dist = getDistanceKm(
                      preferences.latitude,
                      preferences.longitude,
                      shift.latitude,
                      shift.longitude
                    )

                    if (dist > maxDist) return false
                  }
                  return true
                })

                const values = filteredBase.map(s => Number(s.value))
                const distances =
                  isPremium && preferences?.latitude && preferences?.longitude
                    ? filteredBase.map(s =>
                      getDistanceKm(
                        preferences.latitude,
                        preferences.longitude,
                        s.latitude,
                        s.longitude
                      )
                    )
                    : []

                const minValue = values.length ? Math.min(...values) : 0
                const maxValue = values.length ? Math.max(...values) : 0
                const minDist = distances.length ? Math.min(...distances) : 0
                const maxDist = distances.length ? Math.max(...distances) : 0

                const getPremiumScore = (shift: any) => {
                  if (!isPremium || !preferences?.latitude || !preferences?.longitude) return 0

                  const value = Number(shift.value)

                  const dist = getDistanceKm(
                    preferences.latitude,
                    preferences.longitude,
                    shift.latitude,
                    shift.longitude
                  )

                  const valueScore =
                    maxValue === minValue
                      ? 1
                      : (value - minValue) / (maxValue - minValue)

                  const distScore =
                    maxDist === minDist
                      ? 1
                      : 1 - (dist - minDist) / (maxDist - minDist)

                  const start = new Date(shift.start_time).getTime()
                  const now = Date.now()
                  const diffHours = (start - now) / (1000 * 60 * 60)

                  const urgencyScore = diffHours > 0 && diffHours <= 6 ? 1 : 0

                  return valueScore * 0.5 + distScore * 0.3 + urgencyScore * 0.2
                }

                const filteredShifts = filteredBase.sort((a, b) => {
                  const centerLat = mapCenter.lat
                  const centerLng = mapCenter.lng

                  if (!centerLat || !centerLng) return 0

                  const distA = getDistanceKm(
                    centerLat,
                    centerLng,
                    a.latitude,
                    a.longitude
                  )

                  const distB = getDistanceKm(
                    centerLat,
                    centerLng,
                    b.latitude,
                    b.longitude
                  )

                  if (!isPremium) {
                    return distA - distB
                  }

                  const scoreA = getPremiumScore(a)
                  const scoreB = getPremiumScore(b)

                  return scoreB - scoreA
                })

                const topShiftIds = isPremium
                  ? filteredShifts.slice(0, 3).map(s => s.id)
                  : []
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
                            : topShiftIds.includes(shift.id)
                              ? 'border-2 border-yellow-400 shadow-md'
                              : 'border-gray-200 hover:border-gray-400'}
`}
                      >

                        {topShiftIds.includes(shift.id) && (
                          <div className='text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded mb-2 w-fit'>
                            Destaque
                          </div>
                        )}

                        {(() => {
                          const start = new Date(shift.start_time).getTime()
                          const now = Date.now()
                          const diffHours = (start - now) / (1000 * 60 * 60)

                          if (diffHours <= 24 && diffHours > 0) {
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

                          {isPremium && preferences?.latitude && preferences?.longitude && (
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