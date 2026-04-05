//clinic/shifts/create/page.tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
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

export default function CreateShiftPage() {
    const { user, profile, loading: authLoading } = useAuth()

    const [specialty, setSpecialty] = useState('')
    const [value, setValue] = useState('')
    const [start, setStart] = useState('')
    const [end, setEnd] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [clinic, setClinic] = useState<any>(null)
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

            const { data: clinic } = await supabase
                .from('clinics')
                .select('*')
                .eq('id', user.id)
                .single()

            if (!clinic) {
                setError('Clínica não encontrada')
                setLoading(false)
                return
            }

            setClinic(clinic)
            setLoading(false)
        }

        load()
    }, [authLoading, user, profile])

    const handleCreate = async () => {
        setError('')
        setSuccess('')

        if (!clinic) {
            setError('Clínica não carregada')
            return
        }

        if (!clinic.latitude || !clinic.longitude) {
            setError('Endereço da clínica inválido')
            return
        }

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
            setError('Não é possível criar plantões no passado')
            return
        }

        setSubmitting(true)

        const { error } = await supabase.from('shifts').insert({
            clinic_id: user.id,
            specialty,
            start_time: new Date(start),
            end_time: new Date(end),
            value: Number(value),

            latitude: clinic.latitude,
            longitude: clinic.longitude,

            address: clinic.address,
            number: clinic.number,
            complement: clinic.complement,
            city: clinic.city,
            state: clinic.state,
            requires_rqe: requiresRqe
        })

        if (error) {
            setError(error.message)
            setSubmitting(false)
            return
        }

        window.location.href = '/clinic/shifts'
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
                        Criar novo plantão
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
                        onClick={handleCreate}
                        disabled={submitting || loading}
                    >
                        {submitting ? 'Criando...' : 'Criar plantão'}
                    </Button>
                </div>
            </Card>
        </div>
    )
}