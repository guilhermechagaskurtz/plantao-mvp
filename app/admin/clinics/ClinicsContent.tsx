'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Section from '@/components/ui/Section'
import { Table, THead, TH, TR, TD } from '@/components/ui/Table'
import { useSearchParams } from 'next/navigation'

export default function ClinicsContent() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [clinics, setClinics] = useState<any[]>([])
    const searchParams = useSearchParams()
    const saved = searchParams.get('saved')
    const [showSaved, setShowSaved] = useState(false)
    const [page, setPage] = useState(0)
    const PAGE_SIZE = 20
    const [total, setTotal] = useState(0)
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')

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

            let query = supabase
                .from('clinics')
                .select('*', { count: 'exact' })

            if (search) {
                query = query.ilike('name', `%${search}%`)
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
    }, [page, search])

    useEffect(() => {
        if (!saved) return

        setShowSaved(true)

        const timer = setTimeout(() => {
            setShowSaved(false)
            window.history.replaceState({}, '', '/admin/clinics')
        }, 3000)

        return () => clearTimeout(timer)
    }, [saved])

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

        await supabase.from('profiles').delete().eq('id', id)

        setClinics(prev => prev.filter(c => c.id !== id))
    }

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

            <Card className='p-0 overflow-hidden'>
                <div className='p-4 flex gap-2'>
                    <Input
                        value={searchInput}
                        onChange={setSearchInput}
                        placeholder='Buscar clínica por nome'
                        className='max-w-sm'
                    />

                    <Button
                        onClick={() => {
                            setPage(0)
                            setSearch(searchInput)
                        }}
                    >
                        Buscar
                    </Button>
                </div>

                {loading && (
                    <div className='text-xs text-gray-400 px-4 pb-2'>
                        Atualizando...
                    </div>
                )}

                {!loading && clinics.length === 0 && (
                    <div className='text-gray-500 px-4 pb-4'>
                        Nenhuma clínica encontrada
                    </div>
                )}

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
                        {clinics.map(c => (
                            <TR key={c.id}>
                                <TD>{c.name}</TD>
                                <TD>{c.email || '-'}</TD>
                                <TD>{c.city || '-'}</TD>
                                <TD>{c.phone || '-'}</TD>

                                <TD>
                                    <div className='flex gap-2'>
                                        <Button
                                            variant='secondary'
                                            onClick={() => {
                                                window.location.href = `/admin/clinics/${c.id}`
                                            }}
                                        >
                                            Editar
                                        </Button>

                                        <Button
                                            variant='danger'
                                            onClick={() => deleteClinic(c.id)}
                                        >
                                            Excluir
                                        </Button>
                                    </div>
                                </TD>
                            </TR>
                        ))}
                    </tbody>
                </Table>

                <div className='flex justify-between mt-4 px-4 pb-4'>
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
            </Card>
        </div>
    )
}