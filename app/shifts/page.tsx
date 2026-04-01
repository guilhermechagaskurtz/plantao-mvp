'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

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
  const [doctor, setDoctor] = useState<any>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

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
      setError('Perfil de médico não encontrado')
      setLoading(false)
      return
    }

    setDoctor(doctor)

    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .eq('status', 'open')
      .eq('specialty', doctor.specialty)

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

    const filtered = shifts.filter(shift => {
      const distance = getDistanceKm(
        doctor.latitude,
        doctor.longitude,
        shift.latitude,
        shift.longitude
      )

      return distance <= shift.current_radius_km
    })

    setShifts(filtered)
    setLoading(false)
  }

  useEffect(() => {
    loadShifts()
  }, [])

  const acceptShift = async (shiftId: string) => {
    setAcceptingId(shiftId)

    const { data } = await supabase.auth.getUser()
    const user = data.user

    if (!user) {
      setError('Usuário não autenticado')
      setAcceptingId(null)
      return
    }

    const { error } = await supabase.rpc('accept_shift', {
      p_shift_id: shiftId,
      p_doctor_id: user.id
    })

    if (error) {
      setError('Alguém pegou antes')
      setAcceptingId(null)
      return
    }

    setShifts(prev => prev.filter(s => s.id !== shiftId))
    setAcceptingId(null)
  }

  return (

    <div className='p-10 flex flex-col gap-4'>
      {error && (
        <div className='bg-red-100 text-red-700 p-2 rounded'>
          {error}
        </div>
      )}

      {loading && (
        <div className='text-gray-500'>Carregando plantões...</div>
      )}

      {!loading && shifts.length === 0 && (
        <div className='text-gray-500'>Nenhum plantão disponível</div>
      )}
      {!loading && doctor && shifts.map(shift => (
        <div key={shift.id} className='border p-4 bg-white text-black rounded'>
          <p><b>Especialidade:</b> {shift.specialty}</p>
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
          <p><b>Status:</b> {shift.status}</p>

          <button
            onClick={() => acceptShift(shift.id)}
            disabled={acceptingId === shift.id}
            className='mt-2 p-2 bg-green-600 text-white rounded disabled:opacity-50'
          >
            {acceptingId === shift.id ? 'Aceitando...' : 'Aceitar'}
          </button>
        </div>
      ))}
    </div>
  )
}