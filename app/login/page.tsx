/*
app/login/page.tsx
*/
'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { useEffect } from 'react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [type, setType] = useState<'doctor'>('doctor')
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
        .select('type, approval_status')
        .eq('id', user.id)
        .single()

      if (!profile) {
        setCheckingSession(false)
        return
      }

      if (profile.type === 'doctor') {
        if (profile.approval_status !== 'approved') {
          await supabase.auth.signOut()
          setCheckingSession(false)
          return
        }

        router.replace('/shifts')
      } else if (profile.type === 'clinic') {
        router.replace('/clinic/shifts')
      } else if (profile.type === 'admin') {
        router.replace('/admin')
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
      type: 'doctor',
      approval_status: 'pending'
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
      if (profile.approval_status !== 'approved') {
        await supabase.auth.signOut()

        if (profile.approval_status === 'rejected') {
          setError('Seu cadastro foi reprovado')
        } else {
          setError('Seu cadastro está aguardando aprovação')
        }

        setLoading(false)
        return
      }

      router.push('/shifts')
    } else if (profile.type === 'clinic') {
      router.push('/clinic/shifts')
    } else if (profile.type === 'admin') {
      router.push('/admin')
    }

    setLoading(false)
  }

  if (checkingSession) {
    return <div className='p-10 text-gray-500'>Carregando...</div>
  }

  return (
    <div className='min-h-[70vh] flex items-center justify-center'>

      <Card className='w-full max-w-md'>

        <div className='flex flex-col gap-4'>

          <div className='text-center'>
            <h1 className='text-xl font-semibold text-gray-900'>
              Acessar sistema
            </h1>
            <p className='text-sm text-gray-500'>
              Entre ou crie sua conta
            </p>
          </div>

          {error && (
            <div className='bg-red-100 text-red-700 p-2 rounded text-sm'>
              {error}
            </div>
          )}

          {success && (
            <div className='bg-green-100 text-green-700 p-2 rounded text-sm'>
              {success}
            </div>
          )}

          <Input
            value={email}
            onChange={setEmail}
            placeholder='Email'
          />

          <Input
            type='password'
            value={password}
            onChange={setPassword}
            placeholder='Senha'
          />

          {mode === 'login' ? (
            <>
              <Button
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>

              <button
                onClick={() => {
                  setMode('register')
                  setError('')
                  setSuccess('')
                }}
                className='text-sm text-blue-600 hover:underline'
              >
                Criar conta
              </button>
            </>
          ) : (
            <>
              <Button
                onClick={handleRegister}
                disabled={loading}
              >
                {loading ? 'Criando...' : 'Registrar'}
              </Button>

              <button
                onClick={() => {
                  setMode('login')
                  setError('')
                  setSuccess('')
                }}
                className='text-sm text-blue-600 hover:underline'
              >
                Já tenho conta
              </button>
            </>
          )}

        </div>

      </Card>

    </div>
  )
}