'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

const PAGE_SIZE = 20

type ClinicOption = {
    id: string
    name: string | null
}

type DoctorOption = {
    id: string
    name: string | null
}

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
    clinics?: { name?: string | null } | null
    doctors?: { name?: string | null } | null
}

function isToday(date: string) {
    const d = new Date(date)
    const now = new Date()

    return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
    )
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
    const end = shift.end_time ? new Date(shift.end_time) : new Date(start.getTime() + 60 * 60 * 1000)

    if (shift.status === 'open' && start > now) {
        return {
            key: 'open',
            label: 'Aberto',
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
            label: 'Aceito (aguardando início)',
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
            label: 'Pago (aguardando confirmação)',
            tone: 'bg-cyan-100 text-cyan-700 border-cyan-200'
        }
    }

    if (shift.payment_confirmed_by_doctor) {
        return {
            key: 'confirmed',
            label: 'Confirmado',
            tone: 'bg-emerald-100 text-emerald-700 border-emerald-200'
        }
    }

    return {
        key: 'other',
        label: 'Outro',
        tone: 'bg-gray-100 text-gray-700 border-gray-200'
    }
}

export default function AdminShiftsPage() {
    const [doctorInput, setDoctorInput] = useState('')
    const [doctorOptions, setDoctorOptions] = useState<any[]>([])
    const [doctorLoading, setDoctorLoading] = useState(false)

    const { user, profile, loading: authLoading } = useAuth()

    const [shifts, setShifts] = useState<ShiftRow[]>([])
    const [clinics, setClinics] = useState<ClinicOption[]>([])
    const [doctors, setDoctors] = useState<DoctorOption[]>([])

    const [loading, setLoading] = useState(false)
    const [loadingFilters, setLoadingFilters] = useState(false)
    const [error, setError] = useState('')

    const [page, setPage] = useState(0)
    const [total, setTotal] = useState(0)

    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')

    const [clinicFilter, setClinicFilter] = useState('all')
    const [doctorFilter, setDoctorFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'accepted' | 'expired'>('all')
    const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'future' | 'past'>('all')
    const [stageFilter, setStageFilter] = useState<
        | 'all'
        | 'open'
        | 'expired'
        | 'accepted_future'
        | 'in_progress'
        | 'waiting_finish'
        | 'waiting_payment'
        | 'waiting_confirmation'
        | 'confirmed'
    >('all')

    const [hasLoaded, setHasLoaded] = useState(false)
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        if (!doctorInput) {
            setDoctorOptions([])
            return
        }

        const t = setTimeout(async () => {
            setDoctorLoading(true)

            const { data } = await supabase
                .from('doctors')
                .select('id, name')
                .ilike('name', `%${doctorInput}%`)
                .limit(5)

            setDoctorOptions(data || [])
            setDoctorLoading(false)
        }, 300)

        return () => clearTimeout(t)
    }, [doctorInput])

    useEffect(() => {
        const t = setTimeout(() => {
            setPage(0)
            setSearch(searchInput.trim())
        }, 400)

        return () => clearTimeout(t)
    }, [searchInput])

    useEffect(() => {
        if (authLoading) return
        if (!user || profile?.type !== 'admin') return

        const loadFilterOptions = async () => {
            setLoadingFilters(true)

            const [clinicsRes, doctorsRes] = await Promise.all([
                supabase
                    .from('clinics')
                    .select('id, name')
                    .order('name', { ascending: true }),
                supabase
                    .from('doctors')
                    .select('id, name')
                    .order('name', { ascending: true })
            ])

            if (!clinicsRes.error) {
                setClinics(clinicsRes.data || [])
            }

            if (!doctorsRes.error) {
                setDoctors(doctorsRes.data || [])
            }

            setLoadingFilters(false)
        }

        loadFilterOptions()
    }, [authLoading, user, profile])

    useEffect(() => {
        if (authLoading) return
        if (!user || profile?.type !== 'admin') return

        const load = async () => {
            setLoading(true)
            setError('')

            let query = supabase
                .from('shifts')
                .select(
                    `
          *,
          clinics:clinic_id (name),
          doctors:accepted_doctor_id (name)
        `,
                    { count: 'exact' }
                )

            if (search) {
                query = query.or(
                    `specialty.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`
                )
            }

            if (clinicFilter !== 'all') {
                query = query.eq('clinic_id', clinicFilter)
            }

            if (doctorFilter !== 'all') {
                query = query.eq('accepted_doctor_id', doctorFilter)
            }

            if (statusFilter === 'open') {
                query = query.eq('status', 'open').gt('start_time', new Date().toISOString())
            }

            if (statusFilter === 'accepted') {
                query = query.eq('status', 'accepted')
            }

            if (statusFilter === 'expired') {
                query = query.eq('status', 'open').lt('start_time', new Date().toISOString())
            }

            const nowIso = new Date().toISOString()

            if (timeFilter === 'future') {
                query = query.gt('start_time', nowIso)
            }

            if (timeFilter === 'past') {
                query = query.lt('start_time', nowIso)
            }

            query = query
                .order('start_time', { ascending: true })
                .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

            const { data, error, count } = await query

            if (error) {
                setError(error.message)
                setShifts([])
                setTotal(0)
                setLoading(false)
                setHasLoaded(true)
                return
            }

            let finalData = (data || []) as ShiftRow[]

            if (timeFilter === 'today') {
                finalData = finalData.filter(s => isToday(s.start_time))
            }

            if (stageFilter !== 'all') {
                finalData = finalData.filter(s => getStage(s).key === stageFilter)
            }

            setShifts(finalData)
            setTotal(count || 0)
            setLoading(false)
            setHasLoaded(true)
        }

        load()
    }, [
        page,
        search,
        clinicFilter,
        doctorFilter,
        statusFilter,
        timeFilter,
        stageFilter,
        authLoading,
        user,
        profile
    ])

    const indicators = useMemo(() => {
        return {
            open: shifts.filter(s => getStage(s).key === 'open').length,
            expired: shifts.filter(s => getStage(s).key === 'expired').length,
            accepted: shifts.filter(s => getStage(s).key === 'accepted_future').length,
            inProgress: shifts.filter(s => getStage(s).key === 'in_progress').length,
            waitingFinish: shifts.filter(s => getStage(s).key === 'waiting_finish').length,
            waitingPayment: shifts.filter(s => getStage(s).key === 'waiting_payment').length,
            waitingConfirmation: shifts.filter(s => getStage(s).key === 'waiting_confirmation').length,
            confirmed: shifts.filter(s => getStage(s).key === 'confirmed').length,
        }
    }, [shifts])

    const activeFiltersCount = [
        search,
        clinicFilter !== 'all' ? clinicFilter : '',
        doctorFilter !== 'all' ? doctorFilter : '',
        statusFilter !== 'all' ? statusFilter : '',
        timeFilter !== 'all' ? timeFilter : '',
        stageFilter !== 'all' ? stageFilter : ''
    ].filter(Boolean).length

    const totalPages = Math.ceil(total / PAGE_SIZE)

    return (
        <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                    <h1 className='text-2xl font-bold'>Plantões</h1>
                    <div className='text-sm text-gray-600'>
                        {shifts.length} resultado(s) • Página {page + 1} de {totalPages || 1}
                    </div>
                </div>

                <Button
                    variant='secondary'
                    onClick={() => setShowFilters(v => !v)}
                    className='sm:hidden'
                >
                    {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                </Button>
            </div>

            <div className='grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3'>

                <Card className='p-3'>
                    <div className='text-xs text-gray-500 min-h-[32px]'>Abertos</div>
                    <div className='text-2xl font-bold tabular-nums text-yellow-700'>{indicators.open}</div>
                </Card>

                <Card className='p-3'>
                    <div className='text-xs text-gray-500 min-h-[32px]'>Expirados</div>
                    <div className='text-2xl font-bold tabular-nums text-red-700'>{indicators.expired}</div>
                </Card>

                <Card className='p-3'>
                    <div className='text-xs text-gray-500 min-h-[32px]'>Aceitos</div>
                    <div className='text-2xl font-bold tabular-nums text-blue-700'>{indicators.accepted}</div>
                </Card>

                <Card className='p-3'>
                    <div className='text-xs text-gray-500 min-h-[32px]'>Em execução</div>
                    <div className='text-2xl font-bold tabular-nums text-purple-700'>{indicators.inProgress}</div>
                </Card>

                <Card className='p-3'>
                    <div className='text-xs text-gray-500 min-h-[32px]'>Aguardando finalização</div>
                    <div className='text-2xl font-bold tabular-nums text-orange-700'>{indicators.waitingFinish}</div>
                </Card>

                <Card className='p-3'>
                    <div className='text-xs text-gray-500 min-h-[32px]'>Aguardando pagamento</div>
                    <div className='text-2xl font-bold tabular-nums text-indigo-700'>{indicators.waitingPayment}</div>
                </Card>

                <Card className='p-3'>
                    <div className='text-xs text-gray-500 min-h-[32px]'>Aguardando confirmação</div>
                    <div className='text-2xl font-bold tabular-nums text-cyan-700'>{indicators.waitingConfirmation}</div>
                </Card>

                <Card className='p-3'>
                    <div className='text-xs text-gray-500 min-h-[32px]'>Confirmados</div>
                    <div className='text-2xl font-bold tabular-nums text-emerald-700'>{indicators.confirmed}</div>
                </Card>

            </div>

            <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-col gap-3`}>
                <Card className='p-4'>
                    <div className='flex flex-col gap-4'>
                        <div className='grid grid-cols-1 lg:grid-cols-3 gap-3'>
                            <div className='lg:col-span-3'>
                                <Input
                                    value={searchInput}
                                    onChange={setSearchInput}
                                    placeholder='Buscar por especialidade, cidade ou estado'
                                />
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Clínica
                                </label>
                                <select
                                    value={clinicFilter}
                                    onChange={e => {
                                        const value = e.target.value
                                        if (value === clinicFilter) return

                                        setPage(0)
                                        setClinicFilter(value)
                                    }}
                                    className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm'
                                >
                                    <option value='all'>Todas</option>
                                    {clinics.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name || 'Sem nome'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Médico
                                </label>
                                <div className='relative'>
                                    <Input
                                        value={doctorInput}
                                        onChange={setDoctorInput}
                                        placeholder='Buscar médico...'
                                    />

                                    {doctorOptions.length > 0 && (
                                        <div className='absolute z-10 w-full bg-white border rounded-lg mt-1 shadow'>
                                            {doctorOptions.map(d => (
                                                <div
                                                    key={d.id}
                                                    onClick={() => {
                                                        setDoctorFilter(d.id)
                                                        setDoctorInput(d.name)
                                                        setDoctorOptions([])
                                                        setPage(0)
                                                    }}
                                                    className='px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer'
                                                >
                                                    {d.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Status base
                                </label>
                                <select
                                    value={statusFilter}
                                    onChange={e => {
                                        const value = e.target.value as 'all' | 'open' | 'accepted' | 'expired'
                                        if (value === statusFilter) return

                                        setPage(0)
                                        setStatusFilter(value)
                                    }}
                                    className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm'
                                >
                                    <option value='all'>Todos</option>
                                    <option value='open'>Abertos</option>
                                    <option value='accepted'>Aceitos</option>
                                    <option value='expired'>Expirados</option>
                                </select>
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Período
                                </label>
                                <select
                                    value={timeFilter}
                                    onChange={e => {
                                        const value = e.target.value as 'all' | 'today' | 'future' | 'past'
                                        if (value === timeFilter) return

                                        setPage(0)
                                        setTimeFilter(value)
                                    }}
                                    className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm'
                                >
                                    <option value='all'>Todos</option>
                                    <option value='today'>Hoje</option>
                                    <option value='future'>Futuros</option>
                                    <option value='past'>Passados</option>
                                </select>
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Estágio
                                </label>
                                <select
                                    value={stageFilter}
                                    onChange={e => {
                                        const value = e.target.value as
                                            | 'all'
                                            | 'open'
                                            | 'expired'
                                            | 'accepted_future'
                                            | 'in_progress'
                                            | 'waiting_finish'
                                            | 'waiting_payment'
                                            | 'waiting_confirmation'
                                            | 'confirmed'

                                        if (value === stageFilter) return

                                        setPage(0)
                                        setStageFilter(value)
                                    }}
                                    className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm'
                                >
                                    <option value='all'>Todos</option>

                                    <option value='open'>Aberto</option>
                                    <option value='expired'>Expirado</option>

                                    <option value='accepted_future'>Aceito (aguardando início)</option>

                                    <option value='in_progress'>Em execução</option>
                                    <option value='waiting_finish'>Aguardando finalização</option>

                                    <option value='waiting_payment'>Aguardando pagamento</option>
                                    <option value='waiting_confirmation'>Pago (aguardando confirmação)</option>

                                    <option value='confirmed'>Confirmado</option>
                                </select>
                            </div>

                            <div className='flex items-end'>
                                <Button
                                    variant='secondary'
                                    className='w-full'
                                    onClick={() => {
                                        setPage(0)
                                        setSearchInput('')
                                        setSearch('')
                                        setClinicFilter('all')
                                        setDoctorFilter('all')
                                        setStatusFilter('all')
                                        setTimeFilter('all')
                                        setStageFilter('all')
                                        setDoctorInput('')
                                        setDoctorOptions([])
                                    }}
                                >
                                    Limpar filtros
                                </Button>
                            </div>
                        </div>

                        <div className='flex flex-wrap gap-2'>
                            {search && (
                                <span className='rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700'>
                                    Busca: {search}
                                </span>
                            )}

                            {clinicFilter !== 'all' && (
                                <span className='rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700'>
                                    Clínica selecionada
                                </span>
                            )}

                            {doctorFilter !== 'all' && (
                                <span className='rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700'>
                                    Médico: {doctorInput}
                                </span>
                            )}

                            {statusFilter !== 'all' && (
                                <span className='rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700'>
                                    Status: {statusFilter}
                                </span>
                            )}

                            {timeFilter !== 'all' && (
                                <span className='rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700'>
                                    Tempo: {timeFilter}
                                </span>
                            )}

                            {stageFilter !== 'all' && (
                                <span className='rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700'>
                                    Estágio aplicado
                                </span>
                            )}

                            {activeFiltersCount === 0 && (
                                <span className='rounded-full bg-green-50 px-3 py-1 text-xs text-green-700'>
                                    Sem filtros ativos
                                </span>
                            )}
                        </div>

                        {loadingFilters && (
                            <div className='text-sm text-gray-500'>
                                Carregando opções de clínica e médico...
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {error && <div className='text-red-500'>{error}</div>}

            {loading && <div className='text-gray-500'>Carregando...</div>}

            {!loading && hasLoaded && shifts.length === 0 && (
                <Card className='p-6'>
                    <div className='text-sm text-gray-500'>Nenhum resultado</div>
                </Card>
            )}

            {!loading &&
                shifts.map(s => {
                    const stage = getStage(s)

                    return (
                        <Card
                            key={s.id}
                            className='cursor-pointer hover:shadow-md transition p-4 border'
                            onClick={() => {
                                window.location.href = `/admin/shifts/${s.id}`
                            }}
                        >
                            <div className='flex flex-col gap-4'>
                                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                    <div className='flex flex-col gap-2'>
                                        <div className='text-lg font-semibold text-gray-900'>
                                            {s.specialty || '-'}
                                        </div>

                                        <div className='flex flex-wrap gap-2'>
                                            <span
                                                className={`text-xs px-2.5 py-1 rounded-full border font-medium ${stage.tone}`}
                                            >
                                                {stage.label}
                                            </span>

                                            <span className='text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200'>
                                                Status base: {s.status || '-'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className='text-left sm:text-right'>
                                        <div className='text-2xl font-bold text-green-700'>
                                            R$ {Number(s.value || 0).toFixed(2)}
                                        </div>
                                        <div className='text-sm font-medium text-blue-600'>
                                            {getTimeLabel(s.start_time)}
                                        </div>
                                    </div>
                                </div>

                                <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm'>
                                    <div className='rounded-lg bg-gray-50 border border-gray-100 p-3'>
                                        <div className='text-gray-400 text-xs mb-1'>Clínica</div>
                                        <div className='text-gray-800 font-medium'>
                                            {s.clinics?.name || '-'}
                                        </div>
                                    </div>

                                    <div className='rounded-lg bg-gray-50 border border-gray-100 p-3'>
                                        <div className='text-gray-400 text-xs mb-1'>Médico</div>
                                        <div className='text-gray-800 font-medium'>
                                            {s.doctors?.name || '-'}
                                        </div>
                                    </div>

                                    <div className='rounded-lg bg-gray-50 border border-gray-100 p-3'>
                                        <div className='text-gray-400 text-xs mb-1'>Local</div>
                                        <div className='text-gray-800 font-medium'>
                                            {s.city || '-'} / {s.state || '-'}
                                        </div>
                                    </div>

                                    <div className='rounded-lg bg-gray-50 border border-gray-100 p-3'>
                                        <div className='text-gray-400 text-xs mb-1'>Data</div>
                                        <div className='text-gray-800 font-medium'>
                                            {new Date(s.start_time).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )
                })}

            <div className='flex justify-between gap-3 mt-2'>
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