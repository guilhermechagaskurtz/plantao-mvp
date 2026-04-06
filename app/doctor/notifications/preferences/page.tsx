'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { SPECIALTIES } from '@/lib/specialties'
import { useEffect, useState } from 'react'
import { getIsPremium } from '@/lib/services/premium'

type Filter = {
    id: string
    min_value: number | null
    specialties: string[] | null
    radius_km: number | null
    city: string | null
    latitude: number | null
    longitude: number | null
    in_app_enabled: boolean
}

export default function NotificationPreferencesPage() {
    const { profile } = useAuth()
    const [isPremium, setIsPremium] = useState<boolean | null>(null)

    const [filters, setFilters] = useState<Filter[]>([])
    const [draftFilters, setDraftFilters] = useState<Filter[]>([])
    const [loading, setLoading] = useState(true)
    const [savingId, setSavingId] = useState<string | null>(null)

    useEffect(() => {
        if (!profile?.id) return

        const load = async () => {
            const premium = await getIsPremium(profile.id)
            setIsPremium(premium)

            if (!premium) {
                setLoading(false)
                return
            }

            const { data } = await supabase
                .from('doctor_notification_preferences')
                .select('*')
                .eq('doctor_id', profile.id)

            setFilters(data || [])
            setDraftFilters(data || [])
            setLoading(false)
        }

        load()
    }, [profile?.id])

    const updateDraft = (id: string, updates: Partial<Filter>) => {
        setDraftFilters(prev =>
            prev.map(f => (f.id === id ? { ...f, ...updates } : f))
        )
    }

    const saveFilter = async (id: string) => {
        const draft = draftFilters.find(f => f.id === id)
        if (!draft) return

        setSavingId(id)

        await supabase
            .from('doctor_notification_preferences')
            .update({
                min_value: draft.min_value,
                specialties: draft.specialties,
                radius_km: draft.radius_km,
                city: draft.city,
                latitude: draft.latitude,
                longitude: draft.longitude,
                in_app_enabled: draft.in_app_enabled
            })
            .eq('id', id)

        setFilters(prev =>
            prev.map(f => (f.id === id ? draft : f))
        )

        setSavingId(null)
    }

    const cancelEdit = (id: string) => {
        const original = filters.find(f => f.id === id)
        if (!original) return

        setDraftFilters(prev =>
            prev.map(f => (f.id === id ? original : f))
        )
    }

    const deleteFilter = async (id: string) => {
        await supabase
            .from('doctor_notification_preferences')
            .delete()
            .eq('id', id)

        setFilters(prev => prev.filter(f => f.id !== id))
        setDraftFilters(prev => prev.filter(f => f.id !== id))
    }

    const createFilter = async () => {
        if (!profile?.id) return

        const { data } = await supabase
            .from('doctor_notification_preferences')
            .insert({
                doctor_id: profile.id,
                in_app_enabled: true
            })
            .select()
            .single()

        if (data) {
            setFilters(prev => [...prev, data])
            setDraftFilters(prev => [...prev, data])
        }
    }

    if (loading || isPremium === null) {
        return <div className='p-6'>Carregando...</div>
    }

    if (!isPremium) {
        return (
            <div className='p-6 max-w-xl mx-auto text-center'>
                <h1 className='text-lg font-semibold mb-2'>Recurso Premium</h1>
                <p className='text-sm text-gray-600'>
                    Configure alertas personalizados com o plano premium.
                </p>
            </div>
        )
    }

    return (
        <div className='p-6 max-w-2xl mx-auto flex flex-col gap-6'>

            <div className='flex justify-between items-center'>
                <h1 className='text-xl font-semibold'>Filtros de Notificação</h1>

                <button
                    onClick={createFilter}
                    className='bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm'
                >
                    + Novo filtro
                </button>
            </div>

            {filters.length === 0 && (
                <div className='text-gray-500 text-sm'>
                    Nenhum filtro criado
                </div>
            )}

            <div className='flex flex-col gap-4'>
                {draftFilters.map(filter => {

                    const original = filters.find(f => f.id === filter.id)
                    const isDirty = JSON.stringify(filter) !== JSON.stringify(original)

                    return (
                        <div
                            key={filter.id}
                            className='border rounded-lg p-4 flex flex-col gap-4'
                        >

                            {/* header */}
                            <div className='flex justify-between items-center'>
                                <div className='text-sm font-medium'>
                                    Filtro
                                </div>

                                <div className='flex items-center gap-3'>
                                    <button
                                        onClick={() =>
                                            updateDraft(filter.id, {
                                                in_app_enabled: !filter.in_app_enabled
                                            })
                                        }
                                        className={`px-2 py-1 text-xs rounded border
                                            ${filter.in_app_enabled
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-600 border-gray-300'
                                            }`}
                                    >
                                        {filter.in_app_enabled ? 'Ativo' : 'Desativado'}
                                    </button>

                                    <button
                                        onClick={() => deleteFilter(filter.id)}
                                        className='text-red-600 text-xs'
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </div>

                            {/* valor */}
                            <div>
                                <label className='text-xs text-gray-600'>Valor mínimo</label>
                                <input
                                    type='number'
                                    value={filter.min_value ?? ''}
                                    onChange={(e) =>
                                        updateDraft(filter.id, {
                                            min_value: e.target.value
                                                ? Number(e.target.value)
                                                : null
                                        })
                                    }
                                    className='w-full border p-2 rounded'
                                />
                            </div>

                            {/* especialidades */}
                            <div>
                                <label className='text-xs text-gray-600'>Especialidades</label>

                                <div className='grid grid-cols-2 gap-2 mt-1'>
                                    {SPECIALTIES.map(spec => (
                                        <label key={spec} className='flex items-center gap-2 text-sm'>
                                            <input
                                                type='checkbox'
                                                checked={filter.specialties?.includes(spec) || false}
                                                onChange={(e) => {
                                                    const current = filter.specialties || []

                                                    const updated = e.target.checked
                                                        ? [...current, spec]
                                                        : current.filter(s => s !== spec)

                                                    updateDraft(filter.id, {
                                                        specialties: updated
                                                    })
                                                }}
                                            />
                                            {spec}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* cidade */}
                            <div>
                                <label className='text-xs text-gray-600'>Cidade</label>
                                <input
                                    value={filter.city || ''}
                                    onChange={(e) =>
                                        updateDraft(filter.id, {
                                            city: e.target.value
                                        })
                                    }
                                    className='w-full border p-2 rounded'
                                />
                            </div>

                            {/* raio */}
                            <div>
                                <label className='text-xs text-gray-600'>Raio (km)</label>
                                <input
                                    type='number'
                                    value={filter.radius_km ?? ''}
                                    onChange={(e) =>
                                        updateDraft(filter.id, {
                                            radius_km: e.target.value
                                                ? Number(e.target.value)
                                                : null
                                        })
                                    }
                                    className='w-full border p-2 rounded'
                                />
                            </div>

                            {/* ações */}
                            {isDirty && (
                                <div className='flex gap-2 justify-end'>
                                    <button
                                        onClick={() => cancelEdit(filter.id)}
                                        className='px-3 py-1 text-sm border rounded'
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        onClick={() => saveFilter(filter.id)}
                                        disabled={savingId === filter.id}
                                        className='px-3 py-1 text-sm bg-blue-600 text-white rounded disabled:opacity-50'
                                    >
                                        {savingId === filter.id ? 'Salvando...' : 'Salvar'}
                                    </button>
                                </div>
                            )}

                        </div>
                    )
                })}
            </div>
        </div>
    )
}