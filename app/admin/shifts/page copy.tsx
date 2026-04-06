/*
admin/shifts/page.tsx
*/
'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useMemo, useState } from 'react'
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

    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'accepted'>('all')
    const [timeFilter, setTimeFilter] = useState<'today' | 'future' | 'past'>('today')

    const [hasLoaded, setHasLoaded] = useState(false)

    // debounce busca
    useEffect(() => {
        const t = setTimeout(() => {
            setPage(0)
            setSearch(searchInput)
        }, 400)
        return () => clearTimeout(t)
    }, [searchInput])

    useEffect(() => {
        if (authLoading) return
        if (!user || profile?.type !== 'admin') return

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

            if (search) {
                query = query.or(
                    `specialty.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`
                )
            }

            query = query
                .order('start_time', { ascending: true })
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
            setHasLoaded(true)
        }

        load()

        // ⚠️ roda só quando filtros mudam OU auth termina pela primeira vez
    }, [page, search, authLoading])

    /*useEffect(() => {
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

            if (search) {
                query = query.or(`
          specialty.ilike.%${search}%,
          city.ilike.%${search}%,
          state.ilike.%${search}%
        `)
            }

            query = query
                .order('start_time', { ascending: true })
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
    }, [page, search, authLoading, user, profile])*/

    const getTimeLabel = (date: string) => {
        const diffMs = new Date(date).getTime() - new Date().getTime()
        const diffMin = Math.floor(diffMs / 60000)

        if (diffMin <= 0) return 'Já começou'
        if (diffMin < 60) return `Começa em ${diffMin} min`

        const hours = Math.floor(diffMin / 60)
        return `Começa em ${hours}h`
    }

    const isToday = (date: string) => {
        const d = new Date(date)
        const now = new Date()
        return (
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
        )
    }

    const processed = useMemo(() => {
        return shifts
            .filter(s => {
                if (statusFilter === 'open' && s.status !== 'open') return false
                if (statusFilter === 'accepted' && s.status !== 'accepted') return false

                const d = new Date(s.start_time)
                const now = new Date()

                if (timeFilter === 'today') return isToday(s.start_time)
                if (timeFilter === 'future') return d > now && !isToday(s.start_time)
                if (timeFilter === 'past') return d < now && !isToday(s.start_time)

                return true
            })
            .sort((a, b) => {
                // prioridade: open + mais próximo
                if (a.status !== b.status) {
                    return a.status === 'open' ? -1 : 1
                }

                return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            })
    }, [shifts, statusFilter, timeFilter])

    const totalPages = Math.ceil(total / PAGE_SIZE)

    return (
        <div className='flex flex-col gap-4'>
            <h1 className='text-2xl font-bold'>Plantões</h1>

            {/* RESUMO */}
            <div className='text-sm text-gray-600'>
                {processed.length} resultado(s) • Página {page + 1} de {totalPages || 1}
            </div>

            {/* FILTROS */}
            <div className='flex flex-col gap-3'>
                <Input
                    value={searchInput}
                    onChange={setSearchInput}
                    placeholder='Buscar por especialidade, cidade ou estado'
                />

                <div className='flex bg-gray-100 p-1 rounded-lg w-fit'>
                    {[
                        { label: 'Todos', value: 'all' },
                        { label: 'Abertos', value: 'open' },
                        { label: 'Aceitos', value: 'accepted' }
                    ].map(btn => (
                        <button
                            key={btn.value}
                            onClick={() => setStatusFilter(btn.value as any)}
                            className={`px-3 py-1 text-sm rounded-md transition
        ${statusFilter === btn.value
                                    ? 'bg-white shadow text-gray-900'
                                    : 'text-gray-600 hover:text-gray-900'}
      `}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                <div className='flex bg-gray-100 p-1 rounded-lg w-fit'>
                    {[
                        { label: 'Hoje', value: 'today' },
                        { label: 'Futuro', value: 'future' },
                        { label: 'Passado', value: 'past' }
                    ].map(btn => (
                        <button
                            key={btn.value}
                            onClick={() => setTimeFilter(btn.value as any)}
                            className={`px-3 py-1 text-sm rounded-md transition
        ${timeFilter === btn.value
                                    ? 'bg-white shadow text-gray-900'
                                    : 'text-gray-600 hover:text-gray-900'}
      `}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            {error && <div className='text-red-500'>{error}</div>}

            {loading && (
                <div className='text-gray-500'>Carregando...</div>
            )}

            {!loading && hasLoaded && processed.length === 0 && (
                <div className='text-gray-500'>Nenhum resultado</div>
            )}

            {/* LISTA */}
            {!loading &&
                processed.map(s => (
                    <Card
                        key={s.id}
                        className='cursor-pointer hover:shadow-md transition p-4'
                        onClick={() => {
                            window.location.href = `/admin/shifts/${s.id}`
                        }}
                    >
                        <div className='flex flex-col gap-3'>

                            {/* TOPO */}
                            <div className='flex justify-between items-start gap-2'>
                                <div className='text-base font-semibold text-gray-900'>
                                    {s.specialty}
                                </div>

                                <div className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap
          ${s.status === 'open'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-green-100 text-green-700'}
        `}>
                                    {s.status === 'open' ? 'Aberto' : 'Aceito'}
                                </div>
                            </div>

                            {/* VALOR */}
                            <div className='text-2xl font-bold text-green-700'>
                                R$ {Number(s.value).toFixed(2)}
                            </div>

                            {/* TEMPO */}
                            <div className='text-sm font-medium text-blue-600'>
                                {getTimeLabel(s.start_time)}
                            </div>

                            {/* DIVISOR */}
                            <div className='pt-1'>

                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600'>

                                    <div>
                                        <span className='text-gray-400'>Clínica</span><br />
                                        {s.clinics?.name || '-'}
                                    </div>

                                    <div>
                                        <span className='text-gray-400'>Médico</span><br />
                                        {s.doctors?.name || '-'}
                                    </div>

                                    <div>
                                        <span className='text-gray-400'>Local</span><br />
                                        {s.city} / {s.state}
                                    </div>

                                    <div>
                                        <span className='text-gray-400'>Data</span><br />
                                        {new Date(s.start_time).toLocaleString()}
                                    </div>

                                </div>
                            </div>

                        </div>
                    </Card>
                ))}

            {/* PAGINAÇÃO */}
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