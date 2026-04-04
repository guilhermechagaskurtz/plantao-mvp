/*
admin/shifts/page.tsx
*/
'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

const PAGE_SIZE = 20

export default function AdminShiftsPage() {
    const { user, profile, loading: authLoading } = useAuth()
    const [shifts, setShifts] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [page, setPage] = useState(0)
    const [total, setTotal] = useState(0)

    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')

    const [status, setStatus] = useState('')

    useEffect(() => {
        if (authLoading) return

        if (!user || profile?.type !== 'admin') {
            window.location.href = '/login'
            return
        }

        const load = async () => {
            setLoading(true)
            setError('')

            let query = supabase
                .from('shifts')
                .select(`
                *,
                clinics:clinic_id (name),
                doctors:accepted_doctor_id (name)
            `, { count: 'exact' })

            if (status) {
                query = query.eq('status', status)
            }

            if (search) {
                query = query.or(`
                specialty.ilike.%${search}%,
                city.ilike.%${search}%,
                state.ilike.%${search}%
            `)
            }

            query = query
                .order('start_time', { ascending: false })
                .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

            const { data, error, count } = await query

            if (error) {
                setError(error.message)
                setLoading(false)
                return
            }

            setShifts(data || [])
            setTotal(count || 0)
            setLoading(false)
        }

        load()
    }, [page, search, status, authLoading, user, profile])

    return (
        <div className='flex flex-col gap-4'>
            <h1 className='text-2xl font-bold'>Plantões</h1>

            <div className='flex gap-2 flex-wrap'>
                <Input
                    value={searchInput}
                    onChange={setSearchInput}
                    placeholder='Buscar por especialidade, cidade ou estado'
                    className='max-w-sm'
                />

                <select
                    value={status}
                    onChange={e => {
                        setPage(0)
                        setStatus(e.target.value)
                    }}
                    className='border p-2 rounded'
                >
                    <option value=''>Todos status</option>
                    <option value='open'>Open</option>
                    <option value='accepted'>Accepted</option>
                </select>

                <Button
                    onClick={() => {
                        setPage(0)
                        setSearch(searchInput)
                    }}
                >
                    Buscar
                </Button>
            </div>

            {error && <div className='text-red-500'>{error}</div>}
            {loading && <div>Carregando...</div>}

            {!loading && shifts.length === 0 && (
                <div className='text-gray-500'>Nenhum resultado</div>
            )}

            {!loading &&
                shifts.map(s => (
                    <Card
                        key={s.id}
                        className='cursor-pointer hover:shadow-md transition'
                        onClick={() => {
                            window.location.href = `/admin/shifts/${s.id}`
                        }}
                    >
                        <div className='flex flex-col gap-1'>
                            <div className='flex justify-between'>
                                <div className='font-semibold'>{s.specialty}</div>
                                <span className='text-xs bg-gray-200 px-2 py-1 rounded'>
                                    {s.status}
                                </span>
                            </div>

                            <div className='text-sm text-gray-600'>
                                <div><b>Clínica:</b> {s.clinics?.name || '-'}</div>
                                <div><b>Médico:</b> {s.doctors?.name || '-'}</div>
                                <div><b>Local:</b> {s.city} / {s.state}</div>
                                <div><b>Data:</b> {new Date(s.start_time).toLocaleString()}</div>
                                <div><b>Valor:</b> R$ {Number(s.value).toFixed(2)}</div>
                            </div>
                        </div>
                    </Card>
                ))}

            <div className='flex justify-between mt-4'>
                <Button
                    variant='secondary'
                    disabled={page === 0}
                    onClick={() => setPage(p => Math.max(p - 1, 0))}
                >
                    Anterior
                </Button>

                <Button
                    variant='secondary'
                    disabled={(page + 1) * PAGE_SIZE >= total}
                    onClick={() => setPage(p => p + 1)}
                >
                    Próxima
                </Button>
            </div>
        </div>
    )
}