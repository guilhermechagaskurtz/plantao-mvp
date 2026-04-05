//admin/clinics/ClinicsContent.tsx
'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Section from '@/components/ui/Section'
import { Table, THead, TH, TR, TD } from '@/components/ui/Table'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function ClinicsContent() {
    const { user, profile, loading: authLoading } = useAuth()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [clinics, setClinics] = useState<any[]>([])

    const [page, setPage] = useState(0)
    const PAGE_SIZE = 20
    const [total, setTotal] = useState(0)

    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')

    const [cityFilter, setCityFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'missing_phone' | 'missing_email'>('all')

    const searchParams = useSearchParams()
    const saved = searchParams.get('saved')
    const [showSaved, setShowSaved] = useState(false)

    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

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

        if (!user || profile?.type !== 'admin') {
            window.location.href = '/login'
            return
        }

        const load = async () => {
            setLoading(true)
            setError('')

            let query = supabase
                .from('clinics')
                .select('*', { count: 'exact' })

            if (search) {
                query = query.ilike('name', `%${search}%`)
            }

            if (cityFilter) {
                query = query.ilike('city', `%${cityFilter}%`)
            }

            query = query
                .order('name', { ascending: true })
                .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

            const { data, error, count } = await query

            if (error) {
                setError(error.message)
                setLoading(false)
                return
            }

            setClinics(data || [])
            setTotal(count || 0)
            setLoading(false)
        }

        load()
    }, [page, search, cityFilter, user, profile, authLoading])

    useEffect(() => {
        if (!saved) return

        setShowSaved(true)

        const timer = setTimeout(() => {
            setShowSaved(false)
            window.history.replaceState({}, '', '/admin/clinics')
        }, 3000)

        return () => clearTimeout(timer)
    }, [saved])

    const processedClinics = useMemo(() => {
        return clinics
            .map(c => {
                const missingPhone = !c.phone
                const missingEmail = !c.email

                return {
                    ...c,
                    missingPhone,
                    missingEmail
                }
            })
            .filter(c => {
                if (statusFilter === 'missing_phone' && !c.missingPhone) return false
                if (statusFilter === 'missing_email' && !c.missingEmail) return false
                if (statusFilter === 'complete' && (c.missingPhone || c.missingEmail)) return false
                return true
            })
            .sort((a, b) => {
                // prioridade: incompletos primeiro
                const aScore = (a.missingPhone || a.missingEmail) ? 1 : 0
                const bScore = (b.missingPhone || b.missingEmail) ? 1 : 0
                if (aScore !== bScore) return bScore - aScore
                return a.name.localeCompare(b.name)
            })
    }, [clinics, statusFilter])

    const deleteClinic = async (id: string) => {
        const { error } = await supabase
            .from('clinics')
            .delete()
            .eq('id', id)

        if (error) {
            setError(error.message)
            return
        }

        await supabase.from('profiles').delete().eq('id', id)

        setClinics(prev => prev.filter(c => c.id !== id))
    }

    if (authLoading) {
        return <div className='text-gray-500'>Carregando...</div>
    }

    const totalPages = Math.ceil(total / PAGE_SIZE)

    return (
        <div className='flex flex-col gap-4'>

            {showSaved && (
                <div className='bg-green-100 text-green-700 p-3 rounded'>
                    Clínica salva com sucesso
                </div>
            )}

            {error && (
                <div className='bg-red-100 text-red-700 p-3 rounded'>
                    {error}
                </div>
            )}

            <Section
                title='Clínicas'
                action={
                    <Link href='/admin/clinics/create'>
                        <Button>Nova clínica</Button>
                    </Link>
                }
            >
                <></>
            </Section>

            {/* RESUMO */}
            <div className='text-sm text-gray-600'>
                Total: {total} • Página {page + 1} de {totalPages || 1}
            </div>

            {/* FILTROS */}
            <Card>
                <div className='flex flex-col gap-3'>

                    <Input
                        value={searchInput}
                        onChange={setSearchInput}
                        placeholder='Buscar por nome'
                    />

                    <Input
                        value={cityFilter}
                        onChange={setCityFilter}
                        placeholder='Filtrar por cidade'
                    />

                    <div className='flex gap-2 flex-wrap'>
                        <button onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1 rounded text-sm ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                            Todos
                        </button>

                        <button onClick={() => setStatusFilter('complete')}
                            className={`px-3 py-1 rounded text-sm ${statusFilter === 'complete' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                            Completos
                        </button>

                        <button onClick={() => setStatusFilter('missing_phone')}
                            className={`px-3 py-1 rounded text-sm ${statusFilter === 'missing_phone' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                            Sem telefone
                        </button>

                        <button onClick={() => setStatusFilter('missing_email')}
                            className={`px-3 py-1 rounded text-sm ${statusFilter === 'missing_email' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                            Sem email
                        </button>
                    </div>

                    <div className='text-xs text-gray-500'>
                        {processedClinics.length} resultado(s)
                    </div>
                </div>
            </Card>

            {/* TABELA */}
            {/* DESKTOP */}
            <div className='hidden md:block'>
                <Card className='p-0 overflow-hidden'>
                    <div className='overflow-x-auto'>
                        <div className='min-w-[760px]'>
                            <Table>
                                <THead>
                                    <tr>
                                        <TH>Nome</TH>
                                        <TH>Email</TH>
                                        <TH>Cidade</TH>
                                        <TH>Telefone</TH>
                                        <TH>Ações</TH>
                                    </tr>
                                </THead>

                                <tbody>
                                    {processedClinics.map(c => (
                                        <TR key={c.id}>
                                            <TD>
                                                <span className='font-semibold'>{c.name}</span>
                                            </TD>

                                            <TD>
                                                {c.email || <span className='text-yellow-600 text-xs'>Sem email</span>}
                                            </TD>

                                            <TD>{c.city || '-'}</TD>

                                            <TD>
                                                {c.phone || <span className='text-red-600 text-xs'>Sem telefone</span>}
                                            </TD>

                                            <TD>
                                                <div className='flex gap-2'>
                                                    <Button
                                                        variant='secondary'
                                                        onClick={() => window.location.href = `/admin/clinics/${c.id}`}
                                                    >
                                                        Editar
                                                    </Button>

                                                    <Button
                                                        variant='danger'
                                                        onClick={() => {
                                                            if (confirmDeleteId === c.id) {
                                                                deleteClinic(c.id)
                                                                setConfirmDeleteId(null)
                                                            } else {
                                                                setConfirmDeleteId(c.id)
                                                                setTimeout(() => setConfirmDeleteId(null), 3000)
                                                            }
                                                        }}
                                                    >
                                                        {confirmDeleteId === c.id ? 'Confirmar?' : 'Excluir'}
                                                    </Button>
                                                </div>
                                            </TD>
                                        </TR>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </div>
                </Card>
            </div>

            {/* MOBILE */}
            <div className='md:hidden flex flex-col gap-3'>
                {processedClinics.map(c => (
                    <Card key={c.id} className='p-4 flex flex-col gap-2'>

                        <div className='font-semibold text-base'>
                            {c.name}
                        </div>

                        <div className='text-sm text-gray-600'>
                            <div><b>Cidade:</b> {c.city || '-'}</div>

                            <div>
                                <b>Email:</b>{' '}
                                {c.email
                                    ? c.email
                                    : <span className='text-yellow-600'>Sem email</span>}
                            </div>

                            <div>
                                <b>Telefone:</b>{' '}
                                {c.phone
                                    ? c.phone
                                    : <span className='text-red-600'>Sem telefone</span>}
                            </div>
                        </div>

                        <div className='flex gap-2 mt-2'>
                            <Button
                                variant='secondary'
                                className='flex-1'
                                onClick={() => window.location.href = `/admin/clinics/${c.id}`}
                            >
                                Editar
                            </Button>

                            <Button
                                variant='danger'
                                className='flex-1'
                                onClick={() => {
                                    if (confirmDeleteId === c.id) {
                                        deleteClinic(c.id)
                                        setConfirmDeleteId(null)
                                    } else {
                                        setConfirmDeleteId(c.id)
                                        setTimeout(() => setConfirmDeleteId(null), 3000)
                                    }
                                }}
                            >
                                {confirmDeleteId === c.id ? 'Confirmar?' : 'Excluir'}
                            </Button>
                        </div>

                    </Card>
                ))}
            </div>
        </div >
    )
}