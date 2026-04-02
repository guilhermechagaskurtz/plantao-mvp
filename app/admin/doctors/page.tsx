'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

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

            <Card>
                <div className='flex flex-col gap-4'>

                    <div className='text-lg font-semibold text-gray-900'>
                        Filtros
                    </div>

                    <div className='flex flex-col lg:flex-row gap-3'>

                        <div className='flex gap-2 flex-wrap'>
                            <Button
                                variant={statusFilter === 'all' ? 'primary' : 'secondary'}
                                onClick={() => setStatusFilter('all')}
                            >
                                Todos
                            </Button>

                            <Button
                                variant={statusFilter === 'pending' ? 'primary' : 'secondary'}
                                onClick={() => setStatusFilter('pending')}
                            >
                                Pendentes
                            </Button>

                            <Button
                                variant={statusFilter === 'approved' ? 'primary' : 'secondary'}
                                onClick={() => setStatusFilter('approved')}
                            >
                                Aprovados
                            </Button>

                            <Button
                                variant={statusFilter === 'rejected' ? 'primary' : 'secondary'}
                                onClick={() => setStatusFilter('rejected')}
                            >
                                Reprovados
                            </Button>
                        </div>

                        <div className='w-full lg:w-64'>
                            <Input
                                value={search}
                                onChange={setSearch}
                                placeholder='Buscar por nome'
                            />
                        </div>

                    </div>

                </div>
            </Card>

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
                                className='border border-gray-200 p-4 rounded-lg bg-white flex flex-col gap-3 hover:shadow-sm transition'
                            >
                                <div className='flex justify-between items-center'>
                                    <div className='font-semibold text-gray-900'>
                                        {d.doctors?.name || '-'}
                                    </div>

                                    <span className={`text-xs font-medium px-2 py-1 rounded 
      ${d.approval_status === 'pending'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : d.approval_status === 'approved'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'}
    `}>
                                        {d.approval_status === 'pending'
                                            ? 'Pendente'
                                            : d.approval_status === 'approved'
                                                ? 'Aprovado'
                                                : 'Reprovado'}
                                    </span>
                                </div>

                                <div className='text-sm text-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-1'>
                                    <div><b>CRM:</b> {d.doctors?.crm || '-'}</div>
                                    <div><b>Especialidade:</b> {d.doctors?.specialty || '-'}</div>
                                    <div><b>Telefone:</b> {d.doctors?.phone || '-'}</div>
                                    <div><b>Documento:</b> {d.doctors?.document || '-'}</div>
                                </div>

                                {d.doctors?.bio && (
                                    <div className='text-sm text-gray-500'>
                                        {d.doctors.bio}
                                    </div>
                                )}

                                <div className='flex gap-2 justify-end'>
                                    <Button
                                        variant='primary'
                                        disabled={d.approval_status === 'approved'}
                                        onClick={() => updateStatus(d.id, 'approved')}
                                    >
                                        Aprovar
                                    </Button>

                                    <Button
                                        variant='danger'
                                        disabled={d.approval_status === 'rejected'}
                                        onClick={() => updateStatus(d.id, 'rejected')}
                                    >
                                        Reprovar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            })}
        </div>
    )
}