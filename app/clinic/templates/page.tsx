//app/clinic/templates/page.psx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { SPECIALTIES } from '@/lib/specialties'

export default function TemplatesPage() {
    const { user } = useAuth()

    const [templates, setTemplates] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [specialty, setSpecialty] = useState('')
    const [value, setValue] = useState('')
    const [start, setStart] = useState('')
    const [end, setEnd] = useState('')
    const [requiresRqe, setRequiresRqe] = useState(false)

    const [code, setCode] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)


    const load = async () => {
        const { data } = await supabase
            .from('shift_templates')
            .select('*')
            .eq('clinic_id', user.id)
            .order('created_at', { ascending: false })

        setTemplates(data || [])
        setLoading(false)
    }

    useEffect(() => {
        if (!user) return
        load()
    }, [user])

    const handleCreate = async () => {
        if (!code) return

        const parsedValue = Number(
            String(value)
                .replace(/\./g, '')
                .replace(',', '.')
                .replace(/[^\d.-]/g, '')
        )



        await supabase.from('shift_templates').insert({
            clinic_id: user.id,
            specialty: specialty || null,
            value: parsedValue || null,
            start_time: start || null,
            end_time: end || null,
            requires_rqe: requiresRqe,
            code: code
        })

        setSpecialty('')
        setValue('')
        setStart('')
        setEnd('')
        setCode('')
        setRequiresRqe(false)

        load()
    }

    const handleDelete = async (id: string) => {
        await supabase.from('shift_templates').delete().eq('id', id)
        load()
    }

    const handleUpdate = async () => {
        if (!editingId) return

        const parsedValue = Number(
            String(value)
                .replace(/\./g, '')
                .replace(',', '.')
                .replace(/[^\d.-]/g, '')
        )

        await supabase
            .from('shift_templates')
            .update({
                code: code,
                specialty: specialty || null,
                value: parsedValue || null,
                start_time: start || null,
                end_time: end || null,
                requires_rqe: requiresRqe
            })
            .eq('id', editingId)

        setEditingId(null)
        setCode('')
        setSpecialty('')
        setValue('')
        setStart('')
        setEnd('')
        setRequiresRqe(false)

        load()
    }

    return (
        <div className='max-w-xl mx-auto'>
            <Card>
                {editingId && (
                    <div className='bg-yellow-100 text-yellow-800 p-2 rounded mb-2 text-sm'>
                        Editando modelo
                    </div>
                )}
                <h2 className='text-lg font-semibold mb-4'>
                    Modelos de plantão
                </h2>

                <div className='flex flex-col gap-2 mb-4'>
                    <Input
                        value={code}
                        onChange={setCode}
                        placeholder='Código (ex: A1)'
                    />

                    <select
                        value={specialty}
                        onChange={e => setSpecialty(e.target.value)}
                        className='p-2 bg-blue-600 text-white rounded'
                    >
                        <option value=''>Especialidade (opcional)</option>

                        {SPECIALTIES.map(s => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>

                    <Input
                        value={value}
                        onChange={(v) => {
                            const numeric = v.replace(/\D/g, '')
                            const number = Number(numeric) / 100

                            setValue(number.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            }))
                        }}
                        placeholder='Valor'
                    />

                    <Input
                        type='time'
                        value={start}
                        onChange={setStart}
                    />

                    <Input
                        type='time'
                        value={end}
                        onChange={setEnd}
                    />

                    <label className='flex items-center gap-2 text-sm'>
                        <input
                            type='checkbox'
                            checked={requiresRqe}
                            onChange={e => setRequiresRqe(e.target.checked)}
                        />
                        Requer RQE
                    </label>

                    <Button onClick={editingId ? handleUpdate : handleCreate}>
                        {editingId ? 'Atualizar modelo' : 'Criar modelo'}
                    </Button>
                    {editingId && (
                        <Button
                            onClick={() => {
                                setEditingId(null)
                                setCode('')
                                setSpecialty('')
                                setValue('')
                                setStart('')
                                setEnd('')
                                setRequiresRqe(false)
                            }}
                        >
                            Cancelar
                        </Button>
                    )}
                </div>

                <div className='flex flex-col gap-2'>
                    <div className='text-sm text-gray-500 mb-2'>
                        {templates.length} modelos cadastrados
                    </div>
                    {templates.map(t => (
                        <div
                            key={t.id}
                            className='border p-2 rounded flex justify-between items-center'
                        >
                            <div className='text-sm'>
                                <div className='font-semibold text-blue-600'>{t.code}</div>
                                <div>{t.specialty || 'Sem especialidade'}</div>
                                <div>
                                    {t.start_time || '--'} - {t.end_time || '--'}
                                </div>
                                <div>
                                    {t.value
                                        ? Number(t.value).toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                        })
                                        : '--'}
                                </div>
                            </div>
                            <Button
                                onClick={() => {
                                    setEditingId(t.id)
                                    setCode(t.code || '')
                                    setSpecialty(t.specialty || '')
                                    setValue(
                                        t.value
                                            ? Number(t.value).toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL'
                                            })
                                            : ''
                                    )
                                    setStart(t.start_time || '')
                                    setEnd(t.end_time || '')
                                    setRequiresRqe(t.requires_rqe || false)
                                }}
                            >
                                Editar
                            </Button>
                            <Button onClick={() => handleDelete(t.id)}>
                                Excluir
                            </Button>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    )
}