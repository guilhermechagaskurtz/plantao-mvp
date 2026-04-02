'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function AdminClinicsPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [clinics, setClinics] = useState<any[]>([])
    const [editingClinicId, setEditingClinicId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
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

        await supabase
            .from('profiles')
            .delete()
            .eq('id', id)

        setClinics(prev => prev.filter(c => c.id !== id))
    }

    const saveClinic = async (id: string) => {
        if (!editingName) {
            setError('Informe o nome')
            return
        }

        const { error } = await supabase
            .from('clinics')
            .update({ name: editingName })
            .eq('id', id)

        if (error) {
            setError(error.message)
            return
        }

        setClinics(prev =>
            prev.map(c =>
                c.id === id ? { ...c, name: editingName } : c
            )
        )

        setEditingClinicId(null)
        setEditingName('')
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

            <div className='flex justify-between items-center mt-4'>
                <h1 className='text-2xl font-bold'>Clínicas</h1>

                <Link
                    href='/admin/clinics/create'
                    className='px-4 py-2 bg-blue-600 text-white rounded'
                >
                    Nova clínica
                </Link>
            </div>

            {clinics.length === 0 && (
                <div className='text-gray-500'>Nenhuma clínica</div>
            )}

            <div className='border rounded-lg bg-white shadow-sm overflow-hidden'>
                <div className='max-h-[600px] overflow-y-auto'>
                    <input
                        placeholder='Buscar clínica por nome'
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                setPage(0)
                                setSearch(searchInput)
                            }
                        }}
                        className='border p-2 rounded max-w-md'
                    />
                    <button
                        onClick={() => {
                            setPage(0)
                            setSearch(searchInput)
                        }}
                        className='px-3 py-2 bg-blue-600 text-white rounded'
                    >
                        Buscar
                    </button>
                    {loading && (
                        <div className='text-xs text-gray-400'>Atualizando...</div>
                    )}
                    <table className='w-full text-sm'>
                        <thead className='bg-gray-100'>
                            <tr>
                                <th className='text-left p-2'>Nome</th>
                                <th className='text-left p-2'>ID</th>
                                <th className='text-left p-2'>Ações</th>
                            </tr>
                        </thead>

                        <tbody>
                            {clinics.map(c => (
                                <tr key={c.id} className='border-t'>
                                    <td className='p-2'>
                                        {editingClinicId === c.id ? (
                                            <input
                                                value={editingName}
                                                onChange={e => setEditingName(e.target.value)}
                                                className='border p-1 rounded w-full'
                                            />
                                        ) : (
                                            c.name
                                        )}
                                    </td>

                                    <td className='p-2 text-xs text-gray-500'>
                                        {c.id}
                                    </td>

                                    <td className='p-2 flex gap-2'>
                                        {editingClinicId === c.id ? (
                                            <>
                                                <button
                                                    onClick={() => saveClinic(c.id)}
                                                    className='px-2 py-1 bg-green-600 text-white rounded text-xs'
                                                >
                                                    Salvar
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setEditingClinicId(null)
                                                        setEditingName('')
                                                    }}
                                                    className='px-2 py-1 bg-gray-400 text-white rounded text-xs'
                                                >
                                                    Cancelar
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        window.location.href = `/admin/clinics/${c.id}`
                                                    }}
                                                    className='px-2 py-1 bg-yellow-500 text-white rounded text-xs'
                                                >
                                                    Editar
                                                </button>

                                                <button
                                                    onClick={() => deleteClinic(c.id)}
                                                    className='px-2 py-1 bg-red-600 text-white rounded text-xs'
                                                >
                                                    Excluir
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className='flex justify-between mt-4'>
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => Math.max(p - 1, 0))}
                            className='px-3 py-1 border rounded disabled:opacity-50'
                        >
                            Anterior
                        </button>

                        <button
                            disabled={(page + 1) * PAGE_SIZE >= total}
                            onClick={() => setPage(p => p + 1)}
                            className='px-3 py-1 border rounded disabled:opacity-50'
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}