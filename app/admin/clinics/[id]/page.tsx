/*
app/admin/clinics/[id]/page.tsx
*/
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

type ClinicForm = {
    name: string
    cnpj: string
    email: string
    phone: string
    address: string
    number: string
    complement: string
    city: string
    state: string
    zip_code: string
}

export default function EditClinicPage() {
    const { user, profile, loading: authLoading } = useAuth()
    const params = useParams()
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const router = useRouter()


    const [form, setForm] = useState<ClinicForm>({
        name: '',
        cnpj: '',
        email: '',
        phone: '',
        address: '',
        number: '',
        complement: '',
        city: '',
        state: '',
        zip_code: ''
    })

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleChange = (key: keyof ClinicForm, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }))
    }

    useEffect(() => {
        if (authLoading) return

        if (!user || profile?.type !== 'admin') {
            window.location.href = '/login'
            return
        }

        const load = async () => {
            setLoading(true)

            const { data, error } = await supabase
                .from('clinics')
                .select('*')
                .eq('id', id)
                .single()

            if (error || !data) {
                setError('Erro ao carregar clínica')
                setLoading(false)
                return
            }

            setForm({
                name: data.name || '',
                cnpj: data.cnpj || '',
                email: data.email || '',
                phone: data.phone || '',
                address: data.address || '',
                number: data.number || '',
                complement: data.complement || '',
                city: data.city || '',
                state: data.state || '',
                zip_code: data.zip_code || ''
            })

            setLoading(false)
        }

        load()
    }, [id, authLoading, user, profile])


    const handleSave = async () => {
        setError('')
        setSuccess('')

        if (
            !form.address ||
            !form.number ||
            !form.city ||
            !form.state
        ) {
            setError('Preencha todos os dados obrigatórios de endereço')
            setSaving(false)
            return
        }

        setSaving(true)

        const fullAddress = `${form.address} ${form.number}, ${form.city}, ${form.state}, Brasil`

        let latitude = 0
        let longitude = 0

        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`
            )
            const data = await res.json()

            if (data && data.length > 0) {
                latitude = parseFloat(data[0].lat)
                longitude = parseFloat(data[0].lon)
            }
        } catch (err) {
            console.error('Erro ao buscar coordenadas', err)
        }

        if (!latitude || !longitude) {
            setError('Não foi possível localizar o endereço no mapa')
            setSaving(false)
            return
        }
        const { error } = await supabase
            .from('clinics')
            .update({
                name: form.name,
                cnpj: form.cnpj,
                email: form.email,
                phone: form.phone,
                address: form.address,
                number: form.number,
                complement: form.complement,
                city: form.city,
                state: form.state,
                zip_code: form.zip_code,
                latitude,
                longitude
            })
            .eq('id', id)

        if (error) {
            setError(error.message)
            setSaving(false)
            return
        }

        router.push('/admin/clinics?saved=1')
    }

    if (loading) {
        return <div>Carregando...</div>
    }

    const fetchAddress = async (cep: string) => {
        if (cep.length !== 8) return

        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
            const data = await res.json()

            if (data.erro) return

            setForm(prev => ({
                ...prev,
                address: data.logradouro || '',
                city: data.localidade || '',
                state: data.uf || ''
            }))
        } catch (err) {
            console.error(err)
        }
    }
    return (
        <div className='p-6 max-w-2xl mx-auto flex flex-col gap-4'>
            <h1 className='text-2xl font-bold'>Editar clínica</h1>

            {error && <div className='text-red-500'>{error}</div>}
            {success && <div className='text-green-600'>{success}</div>}

            <input value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder='Nome' className='border p-2' />
            <input value={form.cnpj} onChange={e => handleChange('cnpj', e.target.value)} placeholder='CNPJ' className='border p-2' />
            <input value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder='Email' className='border p-2' />
            <input value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder='Telefone' className='border p-2' />

            <input
                value={form.zip_code}
                onChange={e => {
                    const cep = e.target.value.replace(/\D/g, '')
                    handleChange('zip_code', cep)
                    fetchAddress(cep)
                }}
                placeholder='CEP'
                className='border p-2'
            />

            <input value={form.address} onChange={e => handleChange('address', e.target.value)} placeholder='Endereço' className='border p-2' />
            <input value={form.number} onChange={e => handleChange('number', e.target.value)} placeholder='Número' className='border p-2' />
            <input value={form.complement} onChange={e => handleChange('complement', e.target.value)} placeholder='Complemento' className='border p-2' />
            <input value={form.city} disabled className='border p-2 bg-gray-100' />
            <input value={form.state} disabled className='border p-2 bg-gray-100' />

            <button
                onClick={handleSave}
                disabled={saving}
                className='bg-blue-600 text-white p-2 rounded'
            >
                {saving ? 'Salvando...' : 'Salvar'}
            </button>

            <button
                onClick={() => router.push('/admin/clinics')}
                className='bg-gray-400 text-white p-2 rounded'
            >
                Voltar
            </button>
        </div>
    )
}