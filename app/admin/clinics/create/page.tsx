'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CreateClinicPage() {
    const [form, setForm] = useState({
        name: '',
        cnpj: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: ''
    })
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (key: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }))
    }

    const handleSubmit = async () => {
        setError('')

        if (!form.name || !form.email) {
            setError('Nome e email são obrigatórios')
            return
        }

        setLoading(true)

        const password = Math.random().toString(36).slice(-8)

        const { data, error: authError } = await supabase.auth.signUp({
            email: form.email,
            password
        })

        if (authError || !data.user) {
            setError('Erro ao criar usuário')
            setLoading(false)
            return
        }

        const userId = data.user.id

        // profile
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                type: 'clinic',
                approval_status: 'approved'
            })

        if (profileError) {
            setError(profileError.message)
            setLoading(false)
            return
        }

        // clínica
        const { error: clinicError } = await supabase
            .from('clinics')
            .insert({
                id: userId,
                name: form.name,
                cnpj: form.cnpj,
                email: form.email,
                phone: form.phone,
                address: form.address,
                city: form.city,
                state: form.state,
                zip_code: form.zip_code,
                latitude: 0,
                longitude: 0
            })

        if (clinicError) {
            setError(clinicError.message)
            setLoading(false)
            return
        }

        router.push('/admin')
    }
    return (
        <div className='p-6 max-w-2xl mx-auto flex flex-col gap-4'>
            <h1 className='text-2xl font-bold'>Criar clínica</h1>
            {error && (
                <div className='bg-red-100 text-red-700 p-2 rounded'>
                    {error}
                </div>
            )}

            <input
                placeholder='Nome da clínica'
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                className='border p-2 rounded'
            />

            <input
                placeholder='CNPJ'
                value={form.cnpj}
                onChange={e => handleChange('cnpj', e.target.value)}
                className='border p-2 rounded'
            />

            <input
                placeholder='Email'
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                className='border p-2 rounded'
            />

            <input
                placeholder='Telefone'
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className='border p-2 rounded'
            />

            <input
                placeholder='Endereço'
                value={form.address}
                onChange={e => handleChange('address', e.target.value)}
                className='border p-2 rounded'
            />

            <input
                placeholder='Cidade'
                value={form.city}
                onChange={e => handleChange('city', e.target.value)}
                className='border p-2 rounded'
            />

            <input
                placeholder='Estado'
                value={form.state}
                onChange={e => handleChange('state', e.target.value)}
                className='border p-2 rounded'
            />

            <input
                placeholder='CEP'
                value={form.zip_code}
                onChange={e => handleChange('zip_code', e.target.value)}
                className='border p-2 rounded'
            />

            <button
                onClick={handleSubmit}
                disabled={loading}
                className='bg-blue-600 text-white p-2 rounded disabled:opacity-50'
            >
                {loading ? 'Criando...' : 'Criar clínica'}
            </button>
        </div>
    )
}