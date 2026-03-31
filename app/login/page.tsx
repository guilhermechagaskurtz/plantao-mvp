'use client'

import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [type, setType] = useState<'doctor' | 'clinic'>('doctor')

  const handleRegister = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) return alert(error.message)

    const user = data.user
    if (!user) return

    // cria perfil
    await supabase.from('profiles').insert({
      id: user.id,
      type
    })

    alert('Usuário criado')
  }

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) return alert(error.message)

    alert('Logado')
  }

  return (
    <div className='p-10 flex flex-col gap-2'>
      <input placeholder='email' onChange={e => setEmail(e.target.value)} />
      <input placeholder='senha' type='password' onChange={e => setPassword(e.target.value)} />

      <select onChange={e => setType(e.target.value as any)}>
        <option value='doctor'>Médico</option>
        <option value='clinic'>Clínica</option>
      </select>

      <button onClick={handleLogin}>Login</button>
      <button onClick={handleRegister}>Registrar</button>
    </div>
  )
}