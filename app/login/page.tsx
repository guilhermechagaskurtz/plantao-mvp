'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { useEffect } from 'react'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [type, setType] = useState<'doctor' | 'clinic'>('doctor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user

      if (!user) {
        setCheckingSession(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('type')
        .eq('id', user.id)
        .single()

      if (!profile) {
        setCheckingSession(false)
        return
      }

      if (profile.type === 'doctor') {
        router.replace('/shifts')
      } else {
        router.replace('/clinic/shifts')
      }
    }

    checkSession()
  }, [router])

  const handleRegister = async () => {
    setError('')
    setSuccess('')
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const user = data.user
    if (!user) {
      setError('Erro ao criar usuário')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      type
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    setSuccess('Usuário criado com sucesso')
    setLoading(false)
  }

  const handleLogin = async () => {
    setError('')
    setSuccess('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) {
      setError('Usuário não encontrado')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      setError('Perfil não encontrado')
      setLoading(false)
      return
    }

    if (profile.type === 'doctor') {
      router.push('/shifts')
    } else {
      router.push('/clinic/shifts')
    }

    setLoading(false)
  }

  if (checkingSession) {
    return <div className='p-10 text-gray-500'>Carregando...</div>
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
      <input placeholder='email' onChange={e => setEmail(e.target.value)} />
      <input placeholder='senha' type='password' onChange={e => setPassword(e.target.value)} />

      {mode === 'register' && (
        <select
          onChange={e => setType(e.target.value as any)}
          className='p-2 border rounded'
        >
          <option value='doctor'>Médico</option>
          <option value='clinic'>Clínica</option>
        </select>
      )}

      {mode === 'login' ? (
        <>
          <button
            onClick={handleLogin}
            disabled={loading}
            className='p-2 bg-blue-600 text-white rounded disabled:opacity-50'
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <button
            onClick={() => {
              setMode('register')
              setError('')
              setSuccess('')
            }}
            className='text-blue-600'
          >
            Criar conta
          </button>
        </>
      ) : (
        <>
          <button
            onClick={handleRegister}
            disabled={loading}
            className='p-2 bg-green-600 text-white rounded disabled:opacity-50'
          >
            {loading ? 'Criando...' : 'Registrar'}
          </button>

          <button
            onClick={() => {
              setMode('login')
              setError('')
              setSuccess('')
            }}
            className='text-blue-600'
          >
            Já tenho conta
          </button>
        </>
      )}
    </div>
  )
}