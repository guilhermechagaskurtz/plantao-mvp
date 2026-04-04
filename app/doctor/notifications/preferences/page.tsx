//doctor/notifications/preferences/page.tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { SPECIALTIES } from '@/lib/specialties'
import { useEffect, useState, useRef } from 'react'

export default function NotificationPreferencesPage() {
    const { profile } = useAuth()

    const [minValue, setMinValue] = useState('')
    const [specialties, setSpecialties] = useState<string[]>([])
    const [radius, setRadius] = useState('')
    const [city, setCity] = useState('')
    const [lat, setLat] = useState<number | null>(null)
    const [lng, setLng] = useState<number | null>(null)
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const debounceRef = useRef<any>(null)

    const [loading, setLoading] = useState(true)
    const [success, setSuccess] = useState('')
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        if (!profile?.id) return

        const load = async () => {
            const { data } = await supabase
                .from('doctor_notification_preferences')
                .select('*')
                .eq('doctor_id', profile.id)
                .maybeSingle()

            if (data) {
                setMinValue(data.min_value || '')
                setSpecialties(data.specialties || [])
                setRadius(data.radius_km || '')
                setCity(data.city || '')
                setLat(data.latitude || null)
                setLng(data.longitude || null)
            }

            setLoading(false)
        }

        load()
    }, [profile?.id])

    const handleSave = async () => {
        try {
            setErrorMsg('')
            setSuccess('')
            if (!lat || !lng) {
                setErrorMsg('Selecione uma cidade válida')
                return
            }

            const { error } = await supabase
                .from('doctor_notification_preferences')
                .upsert({
                    doctor_id: profile.id,
                    min_value: minValue ? Number(minValue) : null,
                    specialties,
                    radius_km: radius ? Number(radius) : null,
                    city,
                    latitude: lat,
                    longitude: lng
                }, {
                    onConflict: 'doctor_id'
                })

            if (error) {
                console.error(error)
                setErrorMsg('Erro ao salvar')
                return
            }

            setErrorMsg('')
            setSuccess('Preferências salvas com sucesso')

        } catch (err) {
            console.error(err)
            setErrorMsg('Erro inesperado')
        }
    }

    if (loading) return <div className='p-6'>Carregando...</div>

    return (
        <div className='p-6 max-w-xl mx-auto'>
            <h1 className='text-xl font-semibold mb-4'>
                Preferências de Notificação
            </h1>
            {errorMsg && (
                <div className='bg-red-100 text-red-700 p-2 rounded'>
                    {errorMsg}
                </div>
            )}

            {success && (
                <div className='bg-green-100 text-green-700 p-2 rounded'>
                    {success}
                </div>
            )}

            <div className='flex flex-col gap-4'>

                <div>
                    <label className='text-sm'>Valor mínimo</label>
                    <input
                        type='number'
                        value={minValue}
                        onChange={e => setMinValue(e.target.value)}
                        className='w-full border p-2 rounded'
                    />
                </div>

                <div>
                    <label className='text-sm'>Especialidades</label>

                    <div className='flex flex-col gap-2 mt-2'>
                        {SPECIALTIES.map(spec => (
                            <label key={spec} className='flex items-center gap-2'>
                                <input
                                    type='checkbox'
                                    checked={specialties.includes(spec)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSpecialties(prev => [...prev, spec])
                                        } else {
                                            setSpecialties(prev =>
                                                prev.filter(s => s !== spec)
                                            )
                                        }
                                    }}
                                />
                                {spec}
                            </label>
                        ))}
                    </div>
                </div>
                <div className='relative'>
                    <label className='text-sm'>Cidade</label>

                    <input
                        value={city}

                        onChange={(e) => {
                            const value = e.target.value
                            setCity(value)
                            setShowSuggestions(true)

                            clearTimeout(debounceRef.current)

                            debounceRef.current = setTimeout(async () => {
                                if (value.length < 3) {
                                    setSuggestions([])
                                    return
                                }

                                try {
                                    const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`)

                                    if (!res.ok) return

                                    const data = await res.json()
                                    setSuggestions(
                                        (data || []).filter((item: any) =>
                                            item.properties?.city || item.properties?.name
                                        )
                                    )
                                } catch (err) {
                                    console.error(err)
                                }
                            }, 400)
                        }}
                        className='w-full border p-2 rounded'
                        placeholder='Digite a cidade'
                    />

                    {showSuggestions && suggestions.length > 0 && (
                        <div className='absolute z-50 bg-white border w-full mt-1 rounded shadow'>
                            {suggestions.map((s, i) => (
                                <div
                                    key={i}
                                    onClick={() => {
                                        const cityName = [
                                            s.properties?.city || s.properties?.name,
                                            s.properties?.state,
                                            s.properties?.country
                                        ]
                                            .filter(Boolean)
                                            .join(', ')

                                        setCity(cityName)
                                        setLat(s.geometry.coordinates[1])
                                        setLng(s.geometry.coordinates[0])
                                        setShowSuggestions(false)
                                        setSuggestions([])
                                    }}
                                    className='p-2 hover:bg-gray-100 cursor-pointer text-sm'
                                >
                                    {[
                                        s.properties?.city || s.properties?.name,
                                        s.properties?.state,
                                        s.properties?.country
                                    ]
                                        .filter(Boolean)
                                        .join(', ')
                                    }
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div>
                    <label className='text-sm'>Raio (km)</label>
                    <input
                        type='number'
                        value={radius}
                        onChange={e => setRadius(e.target.value)}
                        className='w-full border p-2 rounded'
                    />
                </div>

                <button
                    onClick={handleSave}
                    className='bg-blue-600 text-white px-4 py-2 rounded'
                >
                    Salvar
                </button>

            </div>
        </div>
    )
}