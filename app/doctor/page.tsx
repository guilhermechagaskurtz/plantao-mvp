'use client'

import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export default function DoctorPage() {
  const [name, setName] = useState('')
  const [crm, setCrm] = useState('')
  const [specialty, setSpecialty] = useState('')

  const handleSave = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError) {
      alert(authError.message)
      return
    }

    const user = authData.user

    if (!user) {
      alert('Usuário não está logado')
      return
    }

    const { error } = await supabase.from('doctors').insert({
      id: user.id,
      name,
      crm,
      specialty,
      latitude: -30,
      longitude: -51
    })

    if (error) {
      alert(error.message)
      return
    }

    alert('Médico salvo com sucesso')
  }

  return (
    <div className='p-10 flex flex-col gap-2'>
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
      <input
        placeholder='Especialidade'
        value={specialty}
        onChange={e => setSpecialty(e.target.value)}
        className='p-2 bg-blue-600 text-white rounded'
      />

      <button onClick={handleSave} className='border p-2 bg-blue-600 text-white'>
        Salvar
      </button>
    </div>
  )
}