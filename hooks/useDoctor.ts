//hoots/useDoctor.ts
'use client'

import { useEffect, useState } from 'react'
import { getDoctorById, getDoctorSpecialties, getDoctorInterests } from '@/lib/services/doctor'

export function useDoctor(userId: string | null) {
  const [doctor, setDoctor] = useState<any>(null)
  const [specialties, setSpecialties] = useState<any[]>([])
  const [interests, setInterests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const load = async () => {
      const { data: doctor } = await getDoctorById(userId)
      const { data: specialties } = await getDoctorSpecialties(userId)
      const { data: interests } = await getDoctorInterests(userId)

      setDoctor(doctor)
      setSpecialties(specialties || [])
      setInterests(interests || [])
      setLoading(false)
    }

    load()
  }, [userId])

  return { doctor, specialties, interests, loading }
}