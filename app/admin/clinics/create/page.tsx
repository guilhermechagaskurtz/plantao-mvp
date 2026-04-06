'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateClinicPage() {
    const [form, setForm] = useState({
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
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (key: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }))
    }

    const handleSubmit = async () => {
        setError('')

        if (
            !form.name ||
            !form.email ||
            !form.address ||
            !form.number ||
            !form.city ||
            !form.state
        ) {
            setError('Preencha todos os dados obrigatórios de endereço')
            return
        }

        setLoading(true)

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
        // clínica
        if (!latitude || !longitude) {
            setError('Não foi possível localizar o endereço no mapa')
            setLoading(false)
            return
        }

        const res = await fetch('/api/admin/create-clinic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...form,
                latitude,
                longitude
            })
        })

        const data = await res.json()

        if (!res.ok) {
            setError(data.error || 'Erro ao criar clínica')
            setLoading(false)
            return
        }

        router.push('/admin/clinics?saved=1')
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
                placeholder='CEP'
                value={form.zip_code}
                onChange={e => {
                    const cep = e.target.value.replace(/\D/g, '')
                    handleChange('zip_code', cep)
                    fetchAddress(cep)
                }}
                className='border p-2 rounded'
            />
            <input
                placeholder='Endereço'
                value={form.address}
                onChange={e => handleChange('address', e.target.value)}
                className='border p-2 rounded'
            />
            <input
                placeholder='Número'
                value={form.number}
                onChange={e => handleChange('number', e.target.value)}
                className='border p-2 rounded'
            />

            <input
                placeholder='Complemento'
                value={form.complement}
                onChange={e => handleChange('complement', e.target.value)}
                className='border p-2 rounded'
            />

            <input
                placeholder='Cidade' disabled
                value={form.city}
                onChange={e => handleChange('city', e.target.value)}
                className='border p-2 rounded'
            />

            <input
                placeholder='Estado' disabled
                value={form.state}
                onChange={e => handleChange('state', e.target.value)}
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