/*
admin/shifts/[id]/page.tsx
*/
'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function AdminShiftEditPage() {
    const { user, profile, loading: authLoading } = useAuth()
    const params = useParams()
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [clinics, setClinics] = useState<any[]>([])
    const [doctors, setDoctors] = useState<any[]>([])

    const [form, setForm] = useState<any>({
        clinic_id: '',
        accepted_doctor_id: '',
        specialty: '',
        start_time: '',
        end_time: '',
        value: '',
        address: '',
        number: '',
        complement: '',
        city: '',
        state: '',
        status: 'open',
        paid: false,
        finished_by_doctor: false,
        payment_confirmed_by_doctor: false,
        missed_by_clinic: false
    })

    const setField = (key: string, value: any) => {
        setForm((prev: any) => ({ ...prev, [key]: value }))
    }


    useEffect(() => {
        if (authLoading) return

        if (!user || profile?.type !== 'admin') {
            window.location.href = '/login'
            return
        }

        const load = async () => {
            setLoading(true)

            const { data: shift } = await supabase
                .from('shifts')
                .select('*')
                .eq('id', id)
                .single()

            if (shift) {
                setForm({
                    ...shift,
                    value: shift.value
                        ? Number(shift.value).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                        })
                        : '',
                    start_time: shift.start_time?.slice(0, 16),
                    end_time: shift.end_time?.slice(0, 16)
                })
            }

            const { data: clinicsData } = await supabase
                .from('clinics')
                .select('id, name')
                .order('name')

            const { data: doctorsData } = await supabase
                .from('doctors')
                .select('id, name')
                .order('name')

            setClinics(clinicsData || [])
            setDoctors(doctorsData || [])

            setLoading(false)
        }

        load()
    }, [id, authLoading, user, profile])

    const handleSave = async () => {
        setSaving(true)
        setError('')
        setSuccess('')

        if (!form.start_time || !form.end_time) {
            setError('Preencha data e horário')
            setSaving(false)
            return
        }

        if (new Date(form.end_time) <= new Date(form.start_time)) {
            setError('Horário final inválido')
            setSaving(false)
            return
        }

        if (new Date(form.start_time) <= new Date()) {
            setError('Não é possível definir início no passado')
            setSaving(false)
            return
        }

        if (form.status === 'accepted' && !form.accepted_doctor_id) {
            setError('Selecione um médico para marcar como aceito')
            setSaving(false)
            return
        }

        if (form.status === 'open' && form.accepted_doctor_id) {
            setError('Plantão aberto não pode ter médico definido')
            setSaving(false)
            return
        }

        if (!form.value || Number(form.value) <= 0) {
            setError('Valor inválido')
            setSaving(false)
            return
        }
        const { error } = await supabase
            .from('shifts')
            .update({
                clinic_id: form.clinic_id,
                accepted_doctor_id: form.accepted_doctor_id || null,
                specialty: form.specialty,
                start_time: form.start_time,
                end_time: form.end_time,
                value: Number(
                    String(form.value)
                        .replace(/\./g, '')
                        .replace(',', '.')
                        .replace(/[^\d.-]/g, '')
                ),
                address: form.address,
                number: form.number,
                complement: form.complement,
                city: form.city,
                state: form.state,
                status: form.status,
                paid: form.paid,
                finished_by_doctor: form.finished_by_doctor,
                payment_confirmed_by_doctor: form.payment_confirmed_by_doctor,
                missed_by_clinic: form.missed_by_clinic
            })
            .eq('id', id)

        if (error) {
            setError(error.message)
            setSaving(false)
            return
        }

        setSuccess('Salvo com sucesso')

        setTimeout(() => {
            router.push('/admin/shifts')
        }, 1000)
    }

    if (loading) return <div>Carregando...</div>

    return (
        <div className='flex flex-col gap-4 max-w-2xl mx-auto'>
            <h1 className='text-2xl font-bold'>Editar plantão</h1>

            {error && <div className='text-red-500'>{error}</div>}
            {success && <div className='text-green-600'>{success}</div>}

            <select
                value={form.clinic_id}
                onChange={e => setField('clinic_id', e.target.value)}
                className='border p-2 rounded'
            >
                <option value=''>Clínica</option>
                {clinics.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>

            <select
                value={form.accepted_doctor_id || ''}
                onChange={e => setField('accepted_doctor_id', e.target.value)}
                className='border p-2 rounded'
            >
                <option value=''>Sem médico</option>
                {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </select>

            <Input value={form.specialty} onChange={v => setField('specialty', v)} placeholder='Especialidade' />
            <Input
                value={form.value}
                onChange={(v) => {
                    const numeric = v.replace(/\D/g, '')
                    const number = Number(numeric) / 100

                    setField('value', number.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                    }))
                }}
                placeholder='Valor'
            />

            <Input type='datetime-local' value={form.start_time} onChange={v => setField('start_time', v)} />
            <Input type='datetime-local' value={form.end_time} onChange={v => setField('end_time', v)} />

            <Input value={form.address} onChange={v => setField('address', v)} placeholder='Endereço' />
            <Input
                value={form.number}
                onChange={(v) => {
                    const numeric = v.replace(/\D/g, '')
                    setField('number', numeric)
                }}
                placeholder='Número'
            />
            <Input value={form.complement} onChange={v => setField('complement', v)} placeholder='Complemento' />
            <Input
                value={form.city}
                onChange={(v) => {
                    const cleaned = v.replace(/[0-9]/g, '')
                    setField('city', cleaned)
                }}
                placeholder='Cidade'
            />
            <Input
                value={form.state}
                onChange={(v) => {
                    const letters = v.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2)
                    setField('state', letters)
                }}
                placeholder='UF (ex: RS)'
            />

            <select
                value={form.status}
                onChange={e => setField('status', e.target.value)}
                className='border p-2 rounded'
            >
                <option value='open'>Open</option>
                <option value='accepted'>Accepted</option>
            </select>

            <label className='flex gap-2'>
                <input
                    type='checkbox'
                    checked={form.paid}
                    onChange={e => setField('paid', e.target.checked)}
                />
                Pago
            </label>

            <label className='flex gap-2'>
                <input
                    type='checkbox'
                    checked={form.finished_by_doctor}
                    onChange={e => setField('finished_by_doctor', e.target.checked)}
                />
                Finalizado pelo médico
            </label>

            <label className='flex gap-2'>
                <input
                    type='checkbox'
                    checked={form.payment_confirmed_by_doctor}
                    onChange={e => setField('payment_confirmed_by_doctor', e.target.checked)}
                />
                Pagamento confirmado pelo médico
            </label>

            <label className='flex gap-2'>
                <input
                    type='checkbox'
                    checked={form.missed_by_clinic}
                    onChange={e => setField('missed_by_clinic', e.target.checked)}
                />
                Falta da clínica
            </label>

            <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
            </Button>

            <Button
                variant='secondary'
                onClick={() => router.push('/admin/shifts')}
            >
                Voltar
            </Button>
        </div>
    )
}