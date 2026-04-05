//app/clinic/shifts/[id]/edit/page.tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const specialties = [
    'Clínico Geral',
    'Cardiologia',
    'Pediatria',
    'Ortopedia',
    'Ginecologia',
    'Dermatologia',
    'Psiquiatria'
]

export default function EditShiftPage() {
    const { user, profile, loading: authLoading } = useAuth()
    const { id } = useParams()

    const [specialty, setSpecialty] = useState('')
    const [value, setValue] = useState('')
    const [start, setStart] = useState('')
    const [end, setEnd] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [shift, setShift] = useState<any>(null)
    const [requiresRqe, setRequiresRqe] = useState(false)

    useEffect(() => {
        if (authLoading) return

        /*if (!user || profile?.type !== 'clinic') {
              window.location.href = '/login'
              return
            }*/

        const load = async () => {
            setLoading(true)
            setError('')

            const { data, error } = await supabase
                .from('shifts')
                .select('*')
                .eq('id', id)
                .single()

            if (error || !data) {
                setError('Plantão não encontrado')
                setLoading(false)
                return
            }

            if (data.status !== 'open') {
                setError('Não é possível editar plantão já aceito')
                setLoading(false)
                return
            }

            setShift(data)
            setSpecialty(data.specialty)
            setValue(String(data.value))
            setStart(new Date(data.start_time).toISOString().slice(0, 16))
            setEnd(new Date(data.end_time).toISOString().slice(0, 16))
            setRequiresRqe(data.requires_rqe || false)

            setLoading(false)
        }

        load()
    }, [authLoading, user, profile, id])

    const handleUpdate = async () => {
        setError('')

        if (!specialty) {
            setError('Informe a especialidade')
            return
        }

        if (!value || Number(value) <= 0) {
            setError('Valor inválido')
            return
        }

        if (!start || !end) {
            setError('Preencha data e horário')
            return
        }

        if (new Date(end) <= new Date(start)) {
            setError('Horário final inválido')
            return
        }

        if (new Date(start) <= new Date()) {
            setError('Não é possível editar para o passado')
            return
        }

        setSubmitting(true)

        const { error } = await supabase
            .from('shifts')
            .update({
                specialty,
                start_time: new Date(start),
                end_time: new Date(end),
                value: Number(value),
                requires_rqe: requiresRqe
            })
            .eq('id', id)

        if (error) {
            setError(error.message)
            setSubmitting(false)
            return
        }

        window.location.href = '/clinic/shifts'
    }

    if (loading) {
        return <div className='text-gray-500'>Carregando...</div>
    }

    return (
        <div className='max-w-xl mx-auto'>
            {error && (
                <div className='bg-red-100 text-red-700 p-2 rounded mb-3'>
                    {error}
                </div>
            )}

            <Card>
                <div className='mb-4'>
                    <h2 className='text-lg font-semibold'>
                        Editar plantão
                    </h2>
                </div>

                <div className='flex flex-col gap-3'>
                    <select
                        value={specialty}
                        onChange={e => setSpecialty(e.target.value)}
                        className='p-2 bg-blue-600 text-white rounded'
                    >
                        <option value=''>Selecione a especialidade</option>
                        {specialties.map(s => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>

                    <label className='flex items-center gap-2 text-sm'>
                        <input
                            type='checkbox'
                            checked={requiresRqe}
                            disabled={!specialty}
                            onChange={e => setRequiresRqe(e.target.checked)}
                        />
                        Requer RQE
                    </label>

                    <Input value={value} onChange={setValue} placeholder='Valor' />

                    <Input
                        type='datetime-local'
                        value={start}
                        onChange={setStart}
                    />

                    <Input
                        type='datetime-local'
                        value={end}
                        onChange={setEnd}
                    />

                    <Button
                        onClick={handleUpdate}
                        disabled={submitting}
                    >
                        {submitting ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                </div>
            </Card>
        </div>
    )
}