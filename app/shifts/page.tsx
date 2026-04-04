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

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false
})


export default function ShiftsPage() {
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)
  const [specialtyFilter, setSpecialtyFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [preferences, setPreferences] = useState<any>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
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
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
      {loading && <div className='text-gray-500'>Carregando...</div>}

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
            <div ref={listRef} className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">

              {shifts.length === 0 && (
                <div className='text-gray-500'>
                  Nenhum plantão dentro do seu raio
                </div>
              )}
              {[...shifts]
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
                    data-id={shift.id}
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
                            preferences?.latitude,
                            preferences?.longitude,
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