'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function AdminDoctorsPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [doctors, setDoctors] = useState<any[]>([])
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
    const [search, setSearch] = useState('')

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

    if (loading) {
        return <div className='text-gray-500'>Carregando...</div>
    }

    return (
        <div className='flex flex-col gap-4'>
            {error && (
                <div className='bg-red-100 text-red-700 p-3 rounded'>
                    {error}
                </div>
            )}

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