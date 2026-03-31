'use client'

import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export default function ClinicPage() {
  const [name, setName] = useState('')

  const handleSave = async () => {
    const { data } = await supabase.auth.getUser()
    const user = data.user

    if (!user) {
      alert('Usuário não logado')
      return
    }

    const { error } = await supabase.from('clinics').insert({
      id: user.id,
      name,
      latitude: -30,
      longitude: -51
    })

    if (error) {
      alert(error.message)
      return
    }

    alert('Clínica salva')
  }

  return (
    <div className='p-10 flex flex-col gap-2'>
      <input
        placeholder='Nome da clínica'
        value={name}
        onChange={e => setName(e.target.value)}
        className='border p-2 rounded bg-white text-black'
      />

      <button onClick={handleSave} className='p-2 bg-green-600 text-white rounded'>
        Salvar
      </button>
    </div>
  )
}