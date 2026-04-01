'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [doctors, setDoctors] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [search, setSearch] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [creatingClinic, setCreatingClinic] = useState(false)
  const [clinics, setClinics] = useState<any[]>([])
  const [editingClinicId, setEditingClinicId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')

      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user

      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('type')
        .eq('id', user.id)
        .single()

      if (!profile || profile.type !== 'admin') {
        window.location.href = '/login'
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          approval_status,
          doctors (
            name,
            crm,
            specialty,
            phone,
            document,
            bio
          )
        `)
        .eq('type', 'doctor')

      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select('*')

      if (clinicsError) {
        setError(clinicsError.message)
        setLoading(false)
        return
      }

      setClinics(clinicsData || [])

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setDoctors(data || [])
      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return <div className='text-gray-500'>Carregando...</div>
  }

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const confirmMessage =
      status === 'approved'
        ? 'Deseja aprovar este médico?'
        : 'Deseja reprovar este médico?'

    const confirmed = window.confirm(confirmMessage)

    if (!confirmed) return

    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: status })
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    setDoctors(prev =>
      prev.map(d =>
        d.id === id ? { ...d, approval_status: status } : d
      )
    )
  }

  const createClinic = async () => {
    setError('')

    if (!clinicName) {
      setError('Informe o nome da clínica')
      return
    }

    setCreatingClinic(true)

    // cria usuário auth
    const email = `clinic_${Date.now()}@temp.com`
    const password = Math.random().toString(36).slice(-8)

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error || !data.user) {
      setError('Erro ao criar usuário da clínica')
      setCreatingClinic(false)
      return
    }

    const userId = data.user.id

    // cria profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        type: 'clinic',
        approval_status: 'approved'
      })

    if (profileError) {
      setError(profileError.message)
      setCreatingClinic(false)
      return
    }

    // cria clínica
    const { error: clinicError } = await supabase
      .from('clinics')
      .insert({
        id: userId,
        name: clinicName,
        latitude: 0,
        longitude: 0
      })

    if (clinicError) {
      setError(clinicError.message)
      setCreatingClinic(false)
      return
    }

    setClinicName('')
    setCreatingClinic(false)
  }

  const deleteClinic = async (id: string) => {
    const confirmed = window.confirm('Deseja excluir esta clínica?')

    if (!confirmed) return

    const { error } = await supabase
      .from('clinics')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    // remove também o profile
    await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    setClinics(prev => prev.filter(c => c.id !== id))
  }

  const saveClinic = async (id: string) => {
    if (!editingName) {
      setError('Informe o nome')
      return
    }

    const { error } = await supabase
      .from('clinics')
      .update({ name: editingName })
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    setClinics(prev =>
      prev.map(c =>
        c.id === id ? { ...c, name: editingName } : c
      )
    )

    setEditingClinicId(null)
    setEditingName('')
  }
  return (
    <div className='flex flex-col gap-4'>
      {error && (
        <div className='bg-red-100 text-red-700 p-3 rounded'>
          {error}
        </div>
      )}



      <div className='flex justify-between items-center mt-4'>
        <h1 className='text-2xl font-bold'>Clínicas</h1>

        <Link
          href='/admin/clinics/create'
          className='px-4 py-2 bg-blue-600 text-white rounded'
        >
          Nova clínica
        </Link>
      </div>

      {clinics.length === 0 && (
        <div className='text-gray-500'>Nenhuma clínica</div>
      )}

      <div className='border rounded-lg bg-white shadow-sm overflow-hidden'>
        <div className='max-h-64 overflow-y-auto'>
          <table className='w-full text-sm'>
            <thead className='bg-gray-100'>
              <tr>
                <th className='text-left p-2'>Nome</th>
                <th className='text-left p-2'>ID</th>
                <th className='text-left p-2'>Ações</th>
              </tr>
            </thead>

            <tbody>
              {clinics.map(c => (
                <tr key={c.id} className='border-t'>
                  <td className='p-2'>
                    {editingClinicId === c.id ? (
                      <input
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        className='border p-1 rounded w-full'
                      />
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className='p-2 text-xs text-gray-500'>{c.id}</td>

                  <td className='p-2 flex gap-2'>
                    {editingClinicId === c.id ? (
                      <>
                        <button
                          onClick={() => saveClinic(c.id)}
                          className='px-2 py-1 bg-green-600 text-white rounded text-xs'
                        >
                          Salvar
                        </button>

                        <button
                          onClick={() => {
                            setEditingClinicId(null)
                            setEditingName('')
                          }}
                          className='px-2 py-1 bg-gray-400 text-white rounded text-xs'
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingClinicId(c.id)
                            setEditingName(c.name)
                          }}
                          className='px-2 py-1 bg-yellow-500 text-white rounded text-xs'
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => deleteClinic(c.id)}
                          className='px-2 py-1 bg-red-600 text-white rounded text-xs'
                        >
                          Excluir
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h1 className='text-2xl font-bold'>Médicos</h1>

      <div className='flex gap-2'>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1 border rounded ${statusFilter === 'all' ? 'bg-black text-white' : ''}`}
        >
          Todos
        </button>

        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-3 py-1 border rounded ${statusFilter === 'pending' ? 'bg-black text-white' : ''}`}
        >
          Pending
        </button>

        <button
          onClick={() => setStatusFilter('approved')}
          className={`px-3 py-1 border rounded ${statusFilter === 'approved' ? 'bg-black text-white' : ''}`}
        >
          Approved
        </button>

        <button
          onClick={() => setStatusFilter('rejected')}
          className={`px-3 py-1 border rounded ${statusFilter === 'rejected' ? 'bg-black text-white' : ''}`}
        >
          Rejected
        </button>
        <input
          placeholder='Buscar por nome'
          value={search}
          onChange={e => setSearch(e.target.value)}
          className='border p-2 rounded max-w-md'
        />
      </div>
      {doctors.length === 0 && (
        <div className='text-gray-500'>Nenhum médico</div>
      )}

      {['pending', 'approved', 'rejected'].map(status => {
        if (statusFilter !== 'all' && statusFilter !== status) return null

        const filtered = doctors.filter(d => {
          const matchStatus = d.approval_status === status

          const name = d.doctors?.name || ''
          const matchSearch = name
            .toLowerCase()
            .includes(search.toLowerCase())

          return matchStatus && matchSearch
        })

        if (filtered.length === 0) return null

        return (
          <div key={status} className='flex flex-col gap-2'>
            <h2 className='text-lg font-semibold mt-4'>
              {status === 'pending'
                ? 'Pendentes'
                : status === 'approved'
                  ? 'Aprovados'
                  : 'Reprovados'}
            </h2>

            {filtered.map(d => (
              <div
                key={d.id}
                className={`border p-4 rounded-lg shadow-sm ${d.approval_status === 'pending'
                  ? 'bg-yellow-50 border-yellow-300'
                  : d.approval_status === 'approved'
                    ? 'bg-green-50 border-green-300'
                    : 'bg-red-50 border-red-300'
                  }`}
              >
                <p><b>Nome:</b> {d.doctors?.name || '-'}</p>
                <p><b>CRM:</b> {d.doctors?.crm || '-'}</p>
                <p><b>Especialidade:</b> {d.doctors?.specialty || '-'}</p>
                <p><b>Telefone:</b> {d.doctors?.phone || '-'}</p>
                <p><b>Documento:</b> {d.doctors?.document || '-'}</p>
                <p><b>Bio:</b> {d.doctors?.bio || '-'}</p>
                <div className='flex items-center justify-between'>
                  <p>
                    <b>Status:</b>{' '}
                    <span className='capitalize font-semibold'>
                      {d.approval_status === 'pending'
                        ? 'Pendente'
                        : d.approval_status === 'approved'
                          ? 'Aprovado'
                          : 'Reprovado'}
                    </span>
                  </p>

                  <div className='flex gap-2'>
                    <button
                      onClick={() => updateStatus(d.id, 'approved')}
                      disabled={d.approval_status === 'approved'}
                      className='px-3 py-1 bg-green-600 text-white rounded disabled:opacity-40'
                    >
                      Aprovar
                    </button>

                    <button
                      onClick={() => updateStatus(d.id, 'rejected')}
                      disabled={d.approval_status === 'rejected'}
                      className='px-3 py-1 bg-red-600 text-white rounded disabled:opacity-40'
                    >
                      Reprovar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}