'use client'

import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export default function CreateShift() {
  const [specialty, setSpecialty] = useState('')
  const [value, setValue] = useState('')

  const handleCreate = async () => {
    const { data } = await supabase.auth.getUser()
    const user = data.user

    if (!user) {
      alert('Não logado')
      return
    }

    const { error } = await supabase.from('shifts').insert({
      clinic_id: user.id,
      specialty,
      start_time: new Date(),
      end_time: new Date(),
      value: Number(value),
      latitude: -30,
      longitude: -51
    })

    if (error) {
      alert(error.message)
      return
    }

    alert('Plantão criado')
  }

  return (
    <div className='p-10 flex flex-col gap-2'>
      <input
        placeholder='Especialidade'
        value={specialty}
        onChange={e => setSpecialty(e.target.value)}
        className='border p-2 rounded bg-white text-black'
      />

      <input
        placeholder='Valor'
        value={value}
        onChange={e => setValue(e.target.value)}
        className='border p-2 rounded bg-white text-black'
      />

      <button onClick={handleCreate} className='p-2 bg-purple-600 text-white rounded'>
        Criar plantão
      </button>
    </div>
  )
}