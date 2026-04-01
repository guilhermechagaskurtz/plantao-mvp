/*
app/doctor/page.tsx
*/
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
  const [phone, setPhone] = useState('')
  const [document, setDocument] = useState('')
  const [bio, setBio] = useState('')
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
        setPhone(doctor.phone || '')
        setDocument(doctor.document || '')
        setBio(doctor.bio || '')
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
      phone,
      document,
      bio,
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
    <div className='flex flex-col gap-6 items-center'>
      {error && (
        <div className='bg-red-100 text-red-700 p-3 rounded'>
          {error}
        </div>
      )}

      {success && (
        <div className='bg-green-100 text-green-700 p-3 rounded'>
          {success}
        </div>
      )}

      {loading && (
        <div className='text-gray-500'>Carregando...</div>
      )}

      <div className='bg-white border rounded-lg shadow-sm p-6 flex flex-col gap-4 max-w-2xl w-full'>
        <h1 className='text-xl font-bold'>Perfil do médico</h1>

        <input
          placeholder='Nome'
          value={name}
          onChange={e => setName(e.target.value)}
          className='border p-2 rounded w-full'
        />

        <input
          placeholder='CRM'
          value={crm}
          onChange={e => setCrm(e.target.value)}
          className='border p-2 rounded w-full'
        />

        <input
          placeholder='Telefone'
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className='border p-2 rounded w-full'
        />

        <input
          placeholder='Documento (CPF ou outro)'
          value={document}
          onChange={e => setDocument(e.target.value)}
          className='border p-2 rounded w-full'
        />

        <textarea
          placeholder='Sobre você'
          value={bio}
          onChange={e => setBio(e.target.value)}
          className='border p-2 rounded w-full'
        />

        <select
          value={specialty}
          onChange={e => setSpecialty(e.target.value)}
          className='border p-2 rounded w-full'
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
          className='bg-blue-600 text-white p-2 rounded disabled:opacity-50'
        >
          {submitting ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}