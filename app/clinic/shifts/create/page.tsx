//clinic/shifts/create/page.tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useSearchParams } from 'next/navigation'

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
    const searchParams = useSearchParams()
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
    const [templates, setTemplates] = useState<any[]>([])
    const [selectedTemplateId, setSelectedTemplateId] = useState('')
    const [loadingTemplate, setLoadingTemplate] = useState(false)
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

            const { data: templates } = await supabase
                .from('shift_templates')
                .select('*')
                .eq('clinic_id', user.id)

            setTemplates(templates || [])

            if (!clinic) {
                setError('Clínica não encontrada')
                setLoading(false)
                return
            }

            setClinic(clinic)


            setLoading(false)
        }

        load()

        /*const dateParam = searchParams.get('date')

        const templateId = searchParams.get('template_id')

        if (templateId && templates.length > 0) {
            const template = templates.find(t => t.id === templateId)
            if (template) {
                applyTemplate(template)
                setSelectedTemplateId(templateId)
            }
        }

        if (dateParam) {
            setStart(`${dateParam}T07:00`)
            setEnd(`${dateParam}T19:00`)
        }*/
    }, [authLoading, user, profile])

    useEffect(() => {
        const dateParam = searchParams.get('date')
        const templateId = searchParams.get('template_id')

        if (templateId) {
            setLoadingTemplate(true)
        }

        if (!dateParam) return

        if (!templateId) {
            setStart(`${dateParam}T07:00`)
            setEnd(`${dateParam}T19:00`)
            setSelectedTemplateId('')
            setLoadingTemplate(false)
            return
        }

        if (templates.length === 0) return

        const template = templates.find(t => t.id === templateId)

        if (!template) {
            setStart(`${dateParam}T07:00`)
            setEnd(`${dateParam}T19:00`)
            setSelectedTemplateId('')
            setLoadingTemplate(false)
            return
        }

        setSelectedTemplateId(templateId)

        if (template.specialty) {
            setSpecialty(template.specialty)
        } else {
            setSpecialty('')
        }

        if (template.value) {
            setValue(
                Number(template.value).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                })
            )
        } else {
            setValue('')
        }

        setRequiresRqe(!!template.requires_rqe)

        if (!template.start_time || !template.end_time) {
            setStart(`${dateParam}T07:00`)
            setEnd(`${dateParam}T19:00`)
            setLoadingTemplate(false)
            return
        }

        const [startHour, startMinute] = template.start_time.split(':')
        const [endHour, endMinute] = template.end_time.split(':')

        const startDate = new Date(`${dateParam}T00:00`)
        startDate.setHours(Number(startHour), Number(startMinute), 0, 0)

        const endDate = new Date(`${dateParam}T00:00`)
        endDate.setHours(Number(endHour), Number(endMinute), 0, 0)

        if (endDate <= startDate) {
            endDate.setDate(endDate.getDate() + 1)
        }

        const format = (date: Date) => {
            const yyyy = date.getFullYear()
            const mm = String(date.getMonth() + 1).padStart(2, '0')
            const dd = String(date.getDate()).padStart(2, '0')
            const hh = String(date.getHours()).padStart(2, '0')
            const min = String(date.getMinutes()).padStart(2, '0')

            return `${yyyy}-${mm}-${dd}T${hh}:${min}`
        }

        setStart(format(startDate))
        setEnd(format(endDate))
        setLoadingTemplate(false)
    }, [searchParams, templates])

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

        const parsedValue = Number(
            String(value)
                .replace(/\./g, '')
                .replace(',', '.')
                .replace(/[^\d.-]/g, '')
        )

        if (!parsedValue || parsedValue <= 0) {
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
            start_time: start,
            end_time: end,
            value: parsedValue,

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

    const applyTemplate = (template: any) => {
        if (template.specialty) {
            setSpecialty(template.specialty)
        } else {
            setSpecialty('')
        }

        if (template.value) {
            setValue(
                Number(template.value).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                })
            )
        } else {
            setValue('')
        }

        setRequiresRqe(!!template.requires_rqe)

        const dateParam = searchParams.get('date')
        const baseDate = dateParam || new Date().toISOString().split('T')[0]

        if (!template.start_time || !template.end_time) {
            setStart(`${baseDate}T07:00`)
            setEnd(`${baseDate}T19:00`)
            return
        }

        const [startHour, startMinute] = template.start_time.split(':')
        const [endHour, endMinute] = template.end_time.split(':')

        const startDate = new Date(`${baseDate}T00:00`)
        startDate.setHours(Number(startHour), Number(startMinute), 0, 0)

        const endDate = new Date(`${baseDate}T00:00`)
        endDate.setHours(Number(endHour), Number(endMinute), 0, 0)

        if (endDate <= startDate) {
            endDate.setDate(endDate.getDate() + 1)
        }

        const format = (date: Date) => {
            const yyyy = date.getFullYear()
            const mm = String(date.getMonth() + 1).padStart(2, '0')
            const dd = String(date.getDate()).padStart(2, '0')
            const hh = String(date.getHours()).padStart(2, '0')
            const min = String(date.getMinutes()).padStart(2, '0')

            return `${yyyy}-${mm}-${dd}T${hh}:${min}`
        }

        setStart(format(startDate))
        setEnd(format(endDate))
    }

    return (
        <div className='max-w-xl mx-auto'>
            {error && (
                <div className='bg-red-100 text-red-700 p-2 rounded mb-3'>
                    {error}
                </div>
            )}
            {loadingTemplate && (
                <div className='bg-blue-100 text-blue-700 p-2 rounded mb-3 text-sm'>
                    Aplicando modelo...
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
                        value={selectedTemplateId}
                        onChange={e => {
                            const id = e.target.value
                            setSelectedTemplateId(id)

                            const template = templates.find(t => t.id === id)
                            if (template) applyTemplate(template)
                        }}
                        className='p-2 bg-gray-200 rounded text-black'
                    >
                        <option value=''>Usar modelo (opcional)</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.code} {t.specialty ? `- ${t.specialty}` : ''}
                            </option>
                        ))}
                    </select>
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