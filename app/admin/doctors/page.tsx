/*
admin/doctors/page.tsx
*/

'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'

export default function AdminDoctorsPage() {
    const { user, profile, loading: authLoading } = useAuth()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [doctors, setDoctors] = useState<any[]>([])

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'crm' | 'rqe' | 'ok'>('all')

    useEffect(() => {
        if (authLoading) return

        if (!user || profile?.type !== 'admin') {
            window.location.href = '/login'
            return
        }

        const load = async () => {
            setLoading(true)
            setError('')

            const { data: profilesData, error } = await supabase
                .from('profiles')
                .select(`
          id,
          doctors (
            name,
            crm,
            crm_approved,
            crm_rejection_reason,
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

            const doctorIds = (profilesData || []).map(d => d.id)

            const { data: specialtiesData } = await supabase
                .from('doctor_specialties')
                .select('*')
                .in('doctor_id', doctorIds)

            const specialtiesMap: Record<string, any[]> = {}

                ; (specialtiesData || []).forEach(s => {
                    if (!specialtiesMap[s.doctor_id]) {
                        specialtiesMap[s.doctor_id] = []
                    }
                    specialtiesMap[s.doctor_id].push(s)
                })

            const merged = (profilesData || []).map(d => ({
                ...d,
                specialties: specialtiesMap[d.id] || []
            }))

            setDoctors(merged)
            setLoading(false)
        }

        load()
    }, [authLoading, user, profile])

    const processedDoctors = useMemo(() => {
        return doctors
            .map(d => {
                const crmPending =
                    !!d.doctors?.crm &&
                    !d.doctors?.crm_approved &&
                    !d.doctors?.crm_rejection_reason

                const rqePending =
                    d.specialties?.some(
                        (s: any) => !s.approved && !s.rejection_reason
                    ) || false

                return {
                    ...d,
                    crmPending,
                    rqePending
                }
            })
            .filter(d => {
                const name = d.doctors?.name || ''

                if (!name.toLowerCase().includes(search.toLowerCase())) return false

                if (statusFilter === 'crm' && !d.crmPending) return false
                if (statusFilter === 'rqe' && !d.rqePending) return false
                if (statusFilter === 'ok' && (d.crmPending || d.rqePending)) return false

                return true
            })
            .sort((a, b) => {
                // prioridade: CRM pendente > RQE pendente > resto
                if (a.crmPending !== b.crmPending) return a.crmPending ? -1 : 1
                if (a.rqePending !== b.rqePending) return a.rqePending ? -1 : 1
                return 0
            })
    }, [doctors, search, statusFilter])

    const summary = useMemo(() => {
        const total = doctors.length
        const crm = doctors.filter(d =>
            d.doctors?.crm &&
            !d.doctors?.crm_approved &&
            !d.doctors?.crm_rejection_reason
        ).length

        const rqe = doctors.filter(d =>
            d.specialties?.some((s: any) => !s.approved && !s.rejection_reason)
        ).length

        return { total, crm, rqe }
    }, [doctors])

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

            {/* RESUMO */}
            <div className='text-sm text-gray-600'>
                Total: {summary.total} • CRM pendente: {summary.crm} • RQE pendente: {summary.rqe}
            </div>

            {/* FILTROS */}
            <Card>
                <div className='flex flex-col gap-3'>
                    <Input
                        value={search}
                        onChange={setSearch}
                        placeholder='Buscar por nome'
                    />

                    <div className='flex gap-2 flex-wrap'>
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1 rounded text-sm ${statusFilter === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                                }`}
                        >
                            Todos
                        </button>

                        <button
                            onClick={() => setStatusFilter('crm')}
                            className={`px-3 py-1 rounded text-sm ${statusFilter === 'crm'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                                }`}
                        >
                            CRM pendente
                        </button>

                        <button
                            onClick={() => setStatusFilter('rqe')}
                            className={`px-3 py-1 rounded text-sm ${statusFilter === 'rqe'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                                }`}
                        >
                            RQE pendente
                        </button>

                        <button
                            onClick={() => setStatusFilter('ok')}
                            className={`px-3 py-1 rounded text-sm ${statusFilter === 'ok'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                                }`}
                        >
                            OK
                        </button>
                    </div>

                    <div className='text-xs text-gray-500'>
                        {processedDoctors.length} resultado(s)
                    </div>
                </div>
            </Card>

            {processedDoctors.length === 0 && (
                <div className='text-gray-500'>Nenhum médico encontrado</div>
            )}

            {processedDoctors.map(d => (
                <div
                    key={d.id}
                    className='border border-gray-200 p-4 rounded-lg bg-white flex flex-col gap-3 hover:shadow-sm transition'
                >
                    <div className='flex justify-between items-start flex-wrap gap-2'>
                        <div className='font-semibold text-lg text-gray-900'>
                            {d.doctors?.name || '-'}
                        </div>

                        <div className='flex gap-2 flex-wrap'>
                            {d.crmPending && (
                                <span className='text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded'>
                                    CRM pendente
                                </span>
                            )}

                            {d.rqePending && (
                                <span className='text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded'>
                                    RQE pendente
                                </span>
                            )}

                            {!d.crmPending && !d.rqePending && (
                                <span className='text-xs bg-green-100 text-green-700 px-2 py-1 rounded'>
                                    OK
                                </span>
                            )}
                        </div>
                    </div>

                    <div className='text-sm text-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-1'>
                        <div><b>CRM:</b> {d.doctors?.crm || '-'}</div>

                        <div>
                            <b>Especialidades:</b>{' '}
                            {d.specialties.length > 0
                                ? d.specialties.map((s: any) => s.specialty).join(', ')
                                : '-'}
                        </div>

                        <div><b>Telefone:</b> {d.doctors?.phone || '-'}</div>
                        <div><b>Documento:</b> {d.doctors?.document || '-'}</div>
                    </div>

                    {d.doctors?.bio && (
                        <div className='text-sm text-gray-500'>
                            {d.doctors.bio}
                        </div>
                    )}

                    <div className='flex justify-end'>
                        <Button
                            variant='secondary'
                            onClick={() => {
                                window.location.href = `/admin/doctors/${d.id}`
                            }}
                        >
                            Ver / Editar
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    )
}