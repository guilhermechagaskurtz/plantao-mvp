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

  const loadShifts = async () => {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) return

    const { data: doctor } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!doctor) return

    const { data: shifts } = await supabase
      .from('shifts')
      .select('*')
      .eq('status', 'open')
      .eq('specialty', doctor.specialty)

    if (!shifts) return

    // filtro por distância (JS)
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
  }

  useEffect(() => {
    loadShifts()
  }, [])

  const acceptShift = async (shiftId: string) => {
    const { data } = await supabase.auth.getUser()
    const user = data.user

    if (!user) return

    const { error } = await supabase.rpc('accept_shift', {
      p_shift_id: shiftId,
      p_doctor_id: user.id
    })

    if (error) {
      alert(error.message)
      return
    }

    alert('Plantão aceito')
    loadShifts()
  }

  return (
    <div className='p-10 flex flex-col gap-4'>
      {shifts.map(shift => (
        <div key={shift.id} className='border p-4 bg-white text-black rounded'>
          <p><b>Especialidade:</b> {shift.specialty}</p>
          <p><b>Valor:</b> {shift.value}</p>

          <button
            onClick={() => acceptShift(shift.id)}
            className='mt-2 p-2 bg-green-600 text-white rounded'
          >
            Aceitar
          </button>
        </div>
      ))}
    </div>
  )
}