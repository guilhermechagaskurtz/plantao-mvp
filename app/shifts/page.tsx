/*
app/shifts/page.tsx
*/
'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

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

    if (!user) {
      setError('Usuário não autenticado')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile?.type !== 'doctor') {
      window.location.href = '/clinic/shifts'
      return
    }

    if (!user) {
      setError('Usuário não autenticado')
      setLoading(false)
      return
    }

    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', user.id)
      .single()

    if (doctorError || !doctor) {
      // cria perfil automaticamente
      const { error: insertError } = await supabase
        .from('doctors')
        .insert({
          id: user.id,
          name: 'Novo médico',
          crm: '',
          specialty: '',
          latitude: 0,
          longitude: 0,
          radius_km: 50,
          receive_notifications: true
        })

      if (insertError) {
        setError('Erro ao criar perfil de médico')
        setLoading(false)
        return
      }

      // tenta carregar de novo
      const { data: newDoctor } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', user.id)
        .single()

      setDoctor(newDoctor)
    }

    setDoctor(doctor)

    let query = supabase
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
    query = query.gt('start_time', new Date().toISOString())
    if (doctor.specialty) {
      query = query.eq('specialty', doctor.specialty)
    }

    const { data: shifts, error: shiftsError } = await query

    if (shiftsError) {
      setError(shiftsError.message)
      setLoading(false)
      return
    }

    if (!shifts) {
      setShifts([])
      setLoading(false)
      return
    }

    const now = new Date()

    const filtered = shifts
      .filter(shift => {
        if (shift.status === 'open') {
          return new Date(shift.start_time) > now
        }
        return false
      })
      .sort((a, b) => {
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

    setShifts(filtered)
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

    if (!user) {
      setError('Usuário não autenticado')
      setAcceptingId(null)
      return
    }

    // buscar plantões já aceitos pelo médico
    const { data: myShifts } = await supabase
      .from('shifts')
      .select('start_time, end_time')
      .eq('accepted_doctor_id', user.id)
      .eq('status', 'accepted')

    const newStart = new Date(shift.start_time)
    const newEnd = new Date(shift.end_time)

    const hasConflict = (myShifts || []).some(s => {
      const sStart = new Date(s.start_time)
      const sEnd = new Date(s.end_time)

      return newStart < sEnd && newEnd > sStart
    })

    if (hasConflict) {
      setError('Você já possui um plantão nesse horário')
      setAcceptingId(null)
      return
    }

    const { error } = await supabase.rpc('accept_shift', {
      p_shift_id: shift.id,
      p_doctor_id: user.id
    })

    if (error) {
      setError('Alguém pegou antes')
      setAcceptingId(null)
      return
    }

    setShifts(prev => prev.filter(s => s.id !== shift.id))
    setSuccess('Plantão aceito com sucesso')
    setAcceptingId(null)
  }

  const cancelShift = async (shift: any) => {
    /*const now = new Date()
    const start = new Date(shift.start_time)

    const diffHours = (start.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (diffHours < 24) {
      setError('Não é possível cancelar com menos de 24h')
      return
    }*/

    const { error } = await supabase
      .from('shifts')
      .update({
        status: 'open',
        accepted_doctor_id: null
      })
      .eq('id', shift.id)

    if (error) {
      setError(error.message)
      return
    }

    loadShifts()
  }

  return (

    <div className='flex flex-col gap-X'>
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
        <div className='text-gray-500'>Carregando plantões...</div>
      )}

      {!doctor?.specialty && (
        <div className='border border-yellow-300 bg-yellow-50 text-yellow-800 px-4 py-3 rounded-lg flex items-center gap-2'>
          <span className='font-medium'>Atenção:</span>
          <span className='text-sm'>
            Você ainda não definiu sua especialidade. Mostrando todos os plantões.
          </span>
        </div>
      )}
      {!loading && shifts.length === 0 && (
        <div className='text-gray-500'>Nenhum plantão disponível</div>
      )}
      {!loading && shifts.length > 0 && (
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
          <div className="w-full lg:w-3/5 flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
            {shifts.map(shift => (
              <div
                key={shift.id}
                onClick={() => setSelectedShiftId(shift.id)}
                className={`p-4 bg-white rounded-lg cursor-pointer transition border flex flex-col gap-3
    ${selectedShiftId === shift.id
                    ? 'border-blue-600 shadow-md'
                    : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'
                  }`}
              >

                {/* HEADER */}
                <div className='flex justify-between items-center'>
                  <div className='font-semibold text-gray-900'>
                    {shift.specialty}
                  </div>

                  <span className='text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-700'>
                    Disponível
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

                {/* AÇÃO */}
                <div className='mt-2'>
                  <Button
                    disabled={acceptingId === shift.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      acceptShift(shift)
                    }}
                  >
                    {acceptingId === shift.id ? 'Aceitando...' : 'Aceitar'}
                  </Button>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}
      {/* 
      {!loading && doctor && shifts.map(shift => (
        <div key={shift.id} className='border p-4 bg-white text-black rounded'>
          <p><b>Especialidade:</b> {shift.specialty}</p>
          <p>
            <b>Início:</b>{' '}
            {new Date(shift.start_time).toLocaleString()}
          </p>
          <p>
            <b>Fim:</b>{' '}
            {new Date(shift.end_time).toLocaleString()}
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
          <p>
            <b>Status:</b>{' '}
            {shift.status === 'open' && 'Disponível'}
            {shift.status === 'accepted' && shift.accepted_doctor_id === doctor.id && 'Seu plantão'}
          </p>

          {shift.status === 'open' && (
            <button
              onClick={() => acceptShift(shift)}
              disabled={acceptingId === shift.id}
              className='mt-2 p-2 bg-green-600 text-white rounded disabled:opacity-50'
            >
              {acceptingId === shift.id ? 'Aceitando...' : 'Aceitar'}
            </button>
          )}
        </div>
      ))}
        */}
    </div>
  )
}