'use client'

import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { useEffect } from 'react'

const specialties = [
  'Clínico Geral',
  'Cardiologia',
  'Pediatria',
  'Ortopedia',
  'Ginecologia',
  'Dermatologia',
  'Psiquiatria'
]

export default function DoctorPage() {
  const [name, setName] = useState('')
  const [crm, setCrm] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')

      const { data } = await supabase.auth.getUser()
      const user = data.user

      if (!user) {
        setError('Usuário não autenticado')
        setLoading(false)
        return
      }

      const { data: doctor } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', user.id)
        .single()

      if (doctor) {
        setName(doctor.name || '')
        setCrm(doctor.crm || '')
        setSpecialty(doctor.specialty || '')
      }

      setLoading(false)
    }

    load()
  }, [])

  const handleSave = async () => {
    setError('')
    setSuccess('')

    if (!name) {
      setError('Informe o nome')
      return
    }

    if (!crm) {
      setError('Informe o CRM')
      return
    }

    if (!specialty) {
      setError('Informe a especialidade')
      return
    }

    setSubmitting(true)

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) {
      setError('Usuário não autenticado')
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('doctors').upsert({
      id: user.id,
      name,
      crm,
      specialty,
      latitude: -30,
      longitude: -51
    })

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    setSuccess('Dados salvos com sucesso')
    setSubmitting(false)
  }

  return (
    <div className='p-10 flex flex-col gap-2'>
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
      <input
        placeholder='Nome'
        value={name}
        onChange={e => setName(e.target.value)}
        className='p-2 bg-blue-600 text-white rounded'
      />
      <input
        placeholder='CRM'
        value={crm}
        onChange={e => setCrm(e.target.value)}
        className='p-2 bg-blue-600 text-white rounded'
      />
      <select
        value={specialty}
        onChange={e => setSpecialty(e.target.value)}
        className='p-2 bg-blue-600 text-white rounded'
      >
        <option value=''>Selecione a especialidade</option>

        {specialties.map(s => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <button
        onClick={handleSave}
        disabled={submitting || loading}
        className='border p-2 bg-blue-600 text-white disabled:opacity-50'
      >
        {submitting ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  )
}