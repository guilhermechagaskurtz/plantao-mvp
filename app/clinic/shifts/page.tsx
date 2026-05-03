'use client'

import { supabase } from '@/lib/supabase'
import React, { useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

const PAGE_SIZE = 20

type PeriodFilter = 'all' | 'today' | 'upcoming' | 'past'
type StatusFilter = 'all' | 'open' | 'accepted'

type ShiftRow = {
    id: string
    specialty: string | null
    start_time: string
    end_time: string | null
    value: number | string | null
    status: string | null
    city: string | null
    state: string | null
    clinic_id: string | null
    accepted_doctor_id: string | null
    finished_by_doctor: boolean | null
    paid_by_clinic: boolean | null
    payment_confirmed_by_doctor: boolean | null
    missed_by_clinic: boolean | null
    doctors?: { name?: string | null } | null
}

type FilterOption<T extends string> = {
    value: T
    label: string
    description: string
}

type Counts = {
    period: Record<PeriodFilter, number>
    status: Record<StatusFilter, number>
}

const PERIOD_OPTIONS: FilterOption<PeriodFilter>[] = [
    {
        value: 'all',
        label: 'Todos',
        description: 'Mostra plantões de qualquer período.'
    },
    {
        value: 'today',
        label: 'Hoje',
        description: 'Plantões marcados para hoje.'
    },
    {
        value: 'upcoming',
        label: 'Próximos',
        description: 'Plantões que ainda vão acontecer.'
    },
    {
        value: 'past',
        label: 'Passados',
        description: 'Plantões cuja data já passou.'
    }
]

const STATUS_OPTIONS: FilterOption<StatusFilter>[] = [
    {
        value: 'all',
        label: 'Todos os status',
        description: 'Mostra plantões abertos e aceitos.'
    },
    {
        value: 'open',
        label: 'Abertos',
        description: 'Plantões disponíveis para aceite.'
    },
    {
        value: 'accepted',
        label: 'Aceitos',
        description: 'Plantões já aceitos por um médico.'
    }
]

function getProfileClinicId(profile: unknown) {
    const profileAsAny = profile as any

    const possibleClinicId =
        profileAsAny?.clinic_id ||
        profileAsAny?.clinicId ||
        profileAsAny?.clinic?.id

    return typeof possibleClinicId === 'string' ? possibleClinicId : null
}

function startOfLocalDay(date: Date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}

function addDays(date: Date, days: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
}

function isToday(date: string) {
    const target = new Date(date)
    const todayStart = startOfLocalDay(new Date())
    const tomorrowStart = addDays(todayStart, 1)

    return target >= todayStart && target < tomorrowStart
}

function isUpcoming(date: string) {
    return new Date(date).getTime() > new Date().getTime()
}

function isPast(date: string) {
    return new Date(date).getTime() < new Date().getTime()
}

function matchesPeriod(shift: ShiftRow, period: PeriodFilter) {
    if (period === 'all') return true
    if (period === 'today') return isToday(shift.start_time)
    if (period === 'upcoming') return isUpcoming(shift.start_time)
    if (period === 'past') return isPast(shift.start_time)

    return true
}

function matchesStatus(shift: ShiftRow, status: StatusFilter) {
    if (status === 'all') return true
    return shift.status === status
}

function getOptionLabel<T extends string>(options: FilterOption<T>[], value: T) {
    return options.find(option => option.value === value)?.label || value
}

function formatCurrency(value: number | string | null) {
    return Number(value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    })
}

function formatDateTime(date: string) {
    return new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

function getTimeLabel(date: string) {
    const diffMs = new Date(date).getTime() - new Date().getTime()
    const diffMin = Math.floor(diffMs / 60000)

    if (diffMin <= 0) return 'Já começou'
    if (diffMin < 60) return `Começa em ${diffMin} min`

    const hours = Math.floor(diffMin / 60)
    if (hours < 24) return `Começa em ${hours}h`

    const days = Math.floor(hours / 24)
    return `Começa em ${days}d`
}

function getStage(shift: ShiftRow) {
    const now = new Date()
    const start = new Date(shift.start_time)
    const end = shift.end_time
        ? new Date(shift.end_time)
        : new Date(start.getTime() + 60 * 60 * 1000)

    if (shift.status === 'open' && start > now) {
        return {
            key: 'open',
            label: 'Aberto para aceite',
            tone: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        }
    }

    if (shift.status === 'open' && start <= now) {
        return {
            key: 'expired',
            label: 'Expirado',
            tone: 'bg-red-100 text-red-700 border-red-200'
        }
    }

    if (shift.status === 'accepted' && now < start) {
        return {
            key: 'accepted_future',
            label: 'Aceito, aguardando início',
            tone: 'bg-blue-100 text-blue-700 border-blue-200'
        }
    }

    if (shift.status === 'accepted' && now >= start && now <= end && !shift.finished_by_doctor) {
        return {
            key: 'in_progress',
            label: 'Em execução',
            tone: 'bg-purple-100 text-purple-700 border-purple-200'
        }
    }

    if (shift.status === 'accepted' && now > end && !shift.finished_by_doctor) {
        return {
            key: 'waiting_finish',
            label: 'Aguardando finalização',
            tone: 'bg-orange-100 text-orange-700 border-orange-200'
        }
    }

    if (shift.finished_by_doctor && !shift.paid_by_clinic) {
        return {
            key: 'waiting_payment',
            label: 'Aguardando pagamento',
            tone: 'bg-indigo-100 text-indigo-700 border-indigo-200'
        }
    }

    if (shift.paid_by_clinic && !shift.payment_confirmed_by_doctor) {
        return {
            key: 'waiting_confirmation',
            label: 'Pago, aguardando confirmação',
            tone: 'bg-cyan-100 text-cyan-700 border-cyan-200'
        }
    }

    if (shift.payment_confirmed_by_doctor) {
        return {
            key: 'confirmed',
            label: 'Concluído',
            tone: 'bg-emerald-100 text-emerald-700 border-emerald-200'
        }
    }

    return {
        key: 'other',
        label: 'Não classificado',
        tone: 'bg-gray-100 text-gray-700 border-gray-200'
    }
}

function Badge({ value }: { value: number }) {
    return (
        <span className='ml-2 rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200'>
            {value}
        </span>
    )
}

function PeriodButton({
    option,
    selected,
    count,
    onClick
}: {
    option: FilterOption<PeriodFilter>
    selected: boolean
    count: number
    onClick: () => void
}) {
    return (
        <button
            type='button'
            onClick={onClick}
            title={option.description}
            aria-pressed={selected}
            className={`rounded-xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                selected
                    ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            }`}
        >
            <span className='flex items-center justify-between gap-2'>
                <span className='text-sm font-semibold'>{option.label}</span>
                <Badge value={count} />
            </span>
            <span className='mt-1 block text-xs text-gray-500'>{option.description}</span>
        </button>
    )
}

function StatusChip({
    option,
    selected,
    count,
    onClick
}: {
    option: FilterOption<StatusFilter>
    selected: boolean
    count: number
    onClick: () => void
}) {
    return (
        <button
            type='button'
            onClick={onClick}
            title={option.description}
            aria-pressed={selected}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                selected
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            }`}
        >
            {option.label}
            <Badge value={count} />
        </button>
    )
}

function ActiveFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <button
            type='button'
            onClick={onRemove}
            className='rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-200'
            title='Remover este filtro'
        >
            {label} ×
        </button>
    )
}

export default function ClinicShiftsPage() {
    const { user, profile, loading: authLoading } = useAuth()

    const [allShifts, setAllShifts] = useState<ShiftRow[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [hasLoaded, setHasLoaded] = useState(false)

    const [page, setPage] = useState(0)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(0)
            setSearch(searchInput.trim())
        }, 400)

        return () => clearTimeout(timer)
    }, [searchInput])

    useEffect(() => {
        if (authLoading) return
        if (!user) return

        const loadShifts = async () => {
            setLoading(true)
            setError('')

            const clinicId = getProfileClinicId(profile)
            const cleanSearch = search.replaceAll(',', ' ').trim()

            let query: any = supabase
                .from('shifts')
                .select(
                    `
                        *,
                        doctors:accepted_doctor_id (name)
                    `
                )

            // Se o seu useAuth() já entrega profile.clinic_id, o filtro abaixo garante que a clínica veja apenas seus plantões.
            // Se o seu projeto usa outro nome de campo para o ID da clínica, ajuste a função getProfileClinicId no topo do arquivo.
            if (clinicId) {
                query = query.eq('clinic_id', clinicId)
            }

            if (cleanSearch) {
                query = query.or(
                    `specialty.ilike.%${cleanSearch}%,city.ilike.%${cleanSearch}%,state.ilike.%${cleanSearch}%`
                )
            }

            query = query.order('start_time', { ascending: true })

            const { data, error } = await query

            if (error) {
                setAllShifts([])
                setError(error.message)
                setLoading(false)
                setHasLoaded(true)
                return
            }

            setAllShifts((data || []) as ShiftRow[])
            setLoading(false)
            setHasLoaded(true)
        }

        loadShifts()
    }, [authLoading, user, profile, search])

    const counts = useMemo<Counts>(() => {
        return {
            period: {
                all: allShifts.length,
                today: allShifts.filter(shift => matchesPeriod(shift, 'today')).length,
                upcoming: allShifts.filter(shift => matchesPeriod(shift, 'upcoming')).length,
                past: allShifts.filter(shift => matchesPeriod(shift, 'past')).length
            },
            status: {
                all: allShifts.length,
                open: allShifts.filter(shift => matchesStatus(shift, 'open')).length,
                accepted: allShifts.filter(shift => matchesStatus(shift, 'accepted')).length
            }
        }
    }, [allShifts])

    const filteredShifts = useMemo(() => {
        return allShifts.filter(shift => {
            return matchesPeriod(shift, periodFilter) && matchesStatus(shift, statusFilter)
        })
    }, [allShifts, periodFilter, statusFilter])

    const total = filteredShifts.length
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    const shifts = useMemo(() => {
        const start = page * PAGE_SIZE
        const end = start + PAGE_SIZE
        return filteredShifts.slice(start, end)
    }, [filteredShifts, page])

    useEffect(() => {
        if (page > totalPages - 1) {
            setPage(Math.max(totalPages - 1, 0))
        }
    }, [page, totalPages])

    const activeFilters = useMemo(() => {
        const filters: Array<{ key: string; label: string; onRemove: () => void }> = []

        if (search) {
            filters.push({
                key: 'search',
                label: `Busca: ${search}`,
                onRemove: () => {
                    setSearchInput('')
                    setSearch('')
                    setPage(0)
                }
            })
        }

        if (periodFilter !== 'all') {
            filters.push({
                key: 'period',
                label: `Período: ${getOptionLabel(PERIOD_OPTIONS, periodFilter)}`,
                onRemove: () => {
                    setPeriodFilter('all')
                    setPage(0)
                }
            })
        }

        if (statusFilter !== 'all') {
            filters.push({
                key: 'status',
                label: `Status: ${getOptionLabel(STATUS_OPTIONS, statusFilter)}`,
                onRemove: () => {
                    setStatusFilter('all')
                    setPage(0)
                }
            })
        }

        return filters
    }, [search, periodFilter, statusFilter])

    const resetFilters = () => {
        setSearchInput('')
        setSearch('')
        setPeriodFilter('all')
        setStatusFilter('all')
        setPage(0)
    }

    const changePeriodFilter = (value: PeriodFilter) => {
        setPeriodFilter(value)
        setPage(0)
    }

    const changeStatusFilter = (value: StatusFilter) => {
        setStatusFilter(value)
        setPage(0)
    }

    if (authLoading) {
        return <div className='text-gray-500'>Carregando...</div>
    }

    return (
        <div className='flex flex-col gap-4'>
            <Card className='p-5'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                    <div>
                        <h1 className='text-2xl font-bold text-gray-950'>Seus plantões</h1>
                        <p className='mt-1 text-sm text-gray-500'>
                            Visualize seus plantões por período e status.
                        </p>
                        <p className='mt-1 text-xs text-gray-500'>
                            {loading
                                ? 'Atualizando resultados...'
                                : `${total} resultado(s) encontrado(s) • Página ${page + 1} de ${totalPages}`}
                        </p>
                    </div>

                    <Button
                        onClick={() => {
                            window.location.href = '/clinic/shifts/create'
                        }}
                    >
                        Novo plantão
                    </Button>
                </div>

                <div className='mt-5 flex flex-col gap-5'>
                    <div>
                        <label className='mb-1 block text-sm font-medium text-gray-700'>
                            Buscar plantão
                        </label>
                        <Input
                            value={searchInput}
                            onChange={setSearchInput}
                            placeholder='Busque por especialidade, cidade ou estado...'
                        />
                    </div>

                    <div>
                        <div className='mb-2'>
                            <h2 className='text-sm font-semibold text-gray-800'>Período</h2>
                            <p className='text-xs text-gray-500'>
                                Primeiro escolha quando o plantão acontece.
                            </p>
                        </div>

                        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4'>
                            {PERIOD_OPTIONS.map(option => (
                                <PeriodButton
                                    key={option.value}
                                    option={option}
                                    selected={periodFilter === option.value}
                                    count={counts.period[option.value]}
                                    onClick={() => changePeriodFilter(option.value)}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className='mb-2'>
                            <h2 className='text-sm font-semibold text-gray-800'>Status</h2>
                            <p className='text-xs text-gray-500'>
                                Depois refine pela situação principal do plantão.
                            </p>
                        </div>

                        <div className='flex flex-wrap gap-2'>
                            {STATUS_OPTIONS.map(option => (
                                <StatusChip
                                    key={option.value}
                                    option={option}
                                    selected={statusFilter === option.value}
                                    count={counts.status[option.value]}
                                    onClick={() => changeStatusFilter(option.value)}
                                />
                            ))}
                        </div>
                    </div>

                    <div className='flex flex-wrap items-center gap-2'>
                        {activeFilters.length > 0 ? (
                            <>
                                <span className='text-xs font-medium text-gray-500'>Filtros ativos:</span>

                                {activeFilters.map(filter => (
                                    <ActiveFilterChip
                                        key={filter.key}
                                        label={filter.label}
                                        onRemove={filter.onRemove}
                                    />
                                ))}

                                <button
                                    type='button'
                                    onClick={resetFilters}
                                    className='text-xs font-medium text-blue-600 hover:underline'
                                >
                                    Limpar todos
                                </button>
                            </>
                        ) : (
                            <span className='rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700'>
                                Sem filtros ativos
                            </span>
                        )}
                    </div>
                </div>
            </Card>

            {error && <div className='text-sm text-red-500'>{error}</div>}

            {loading && <div className='text-sm text-gray-500'>Carregando plantões...</div>}

            {!loading && hasLoaded && shifts.length === 0 && (
                <Card className='p-6'>
                    <div className='text-sm font-medium text-gray-700'>Nenhum plantão encontrado</div>
                    <div className='mt-1 text-sm text-gray-500'>
                        Tente remover algum filtro ou buscar por outro termo.
                    </div>
                </Card>
            )}

            {!loading && shifts.map(shift => {
                const stage = getStage(shift)

                return (
                    <Card
                        key={shift.id}
                        className='cursor-pointer border p-4 transition hover:shadow-md'
                        onClick={() => {
                            window.location.href = `/clinic/shifts/${shift.id}`
                        }}
                    >
                        <div className='flex flex-col gap-4'>
                            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                <div className='flex flex-col gap-2'>
                                    <div className='text-lg font-semibold text-gray-900'>
                                        {shift.specialty || 'Plantão sem especialidade'}
                                    </div>

                                    <div className='flex flex-wrap gap-2'>
                                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${stage.tone}`}>
                                            {stage.label}
                                        </span>

                                        {shift.status && (
                                            <span className='rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs text-gray-700'>
                                                Status técnico: {shift.status}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className='text-left sm:text-right'>
                                    <div className='text-2xl font-bold text-green-700'>
                                        {formatCurrency(shift.value)}
                                    </div>
                                    <div className='text-sm font-medium text-blue-600'>
                                        {getTimeLabel(shift.start_time)}
                                    </div>
                                </div>
                            </div>

                            <div className='grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-4'>
                                <div className='rounded-lg border border-gray-100 bg-gray-50 p-3'>
                                    <div className='mb-1 text-xs text-gray-400'>Médico</div>
                                    <div className='font-medium text-gray-800'>
                                        {shift.doctors?.name || 'Ainda não aceito'}
                                    </div>
                                </div>

                                <div className='rounded-lg border border-gray-100 bg-gray-50 p-3'>
                                    <div className='mb-1 text-xs text-gray-400'>Local</div>
                                    <div className='font-medium text-gray-800'>
                                        {shift.city || '-'} / {shift.state || '-'}
                                    </div>
                                </div>

                                <div className='rounded-lg border border-gray-100 bg-gray-50 p-3'>
                                    <div className='mb-1 text-xs text-gray-400'>Data e horário</div>
                                    <div className='font-medium text-gray-800'>
                                        {formatDateTime(shift.start_time)}
                                    </div>
                                </div>

                                <div className='rounded-lg border border-gray-100 bg-gray-50 p-3'>
                                    <div className='mb-1 text-xs text-gray-400'>ID do plantão</div>
                                    <div className='truncate font-medium text-gray-800'>
                                        {shift.id}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                )
            })}

            <div className='mt-2 flex items-center justify-between gap-3'>
                <Button
                    variant='secondary'
                    disabled={page === 0 || loading}
                    onClick={() => setPage(currentPage => Math.max(currentPage - 1, 0))}
                >
                    Anterior
                </Button>

                <div className='text-sm text-gray-500'>
                    Página {page + 1} de {totalPages}
                </div>

                <Button
                    variant='secondary'
                    disabled={page + 1 >= totalPages || loading}
                    onClick={() => setPage(currentPage => currentPage + 1)}
                >
                    Próxima
                </Button>
            </div>
        </div>
    )
}
