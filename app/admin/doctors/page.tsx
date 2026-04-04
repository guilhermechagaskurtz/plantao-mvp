/*
admin/doctors/page.tsx
*/

'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
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
                        Buscar
                    </div>

                    <Input
                        value={search}
                        onChange={setSearch}
                        placeholder='Buscar por nome'
                    />
                </div>
            </Card>

            {doctors.length === 0 && (
                <div className='text-gray-500'>Nenhum médico</div>
            )}

            {doctors
                .filter(d => {
                    const name = d.doctors?.name || ''
                    return name.toLowerCase().includes(search.toLowerCase())
                })
                .map(d => (
                    <div
                        key={d.id}
                        className='border border-gray-200 p-4 rounded-lg bg-white flex flex-col gap-3 hover:shadow-sm transition'
                    >
                        <div className='font-semibold text-gray-900'>
                            {d.doctors?.name || '-'}
                        </div>
                        {(() => {
                            const crmPending =
                                !!d.doctors?.crm &&
                                !d.doctors?.crm_approved &&
                                !d.doctors?.crm_rejection_reason

                            const rqePending =
                                d.specialties?.some(
                                    (s: any) => !s.approved && !s.rejection_reason
                                ) || false

                            if (!crmPending && !rqePending) return null

                            return (
                                <div className='flex gap-2 flex-wrap mt-1'>
                                    {crmPending && (
                                        <span className='text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded'>
                                            CRM pendente
                                        </span>
                                    )}

                                    {rqePending && (
                                        <span className='text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded'>
                                            RQE pendente
                                        </span>
                                    )}
                                </div>
                            )
                        })()}

                        <div className='text-sm text-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-1'>
                            <div><b>CRM:</b> {d.doctors?.crm || '-'}</div>

                            <div>
                                <b>Especialidades:</b>{' '}
                                {d.specialties && d.specialties.length > 0
                                    ? d.specialties
                                        .map((s: { specialty: string }) => s.specialty)
                                        .join(', ')
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

                        <div className='flex gap-2 justify-end'>
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