//doctor/notifications/preferences/page.tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { SPECIALTIES } from '@/lib/specialties'
import { useEffect, useState, useRef } from 'react'

export default function NotificationPreferencesPage() {
    const { profile } = useAuth()

    const [enabled, setEnabled] = useState(true)

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
    const [saving, setSaving] = useState(false)
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
                setEnabled(data.in_app_enabled ?? true)
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
            setSaving(true)
            setErrorMsg('')
            setSuccess('')

            const { error } = await supabase
                .from('doctor_notification_preferences')
                .upsert({
                    doctor_id: profile.id,
                    in_app_enabled: enabled,
                    min_value: minValue ? Number(minValue) : null,
                    specialties,
                    radius_km: radius ? Number(radius) : null,
                    city: lat && lng ? city : null,
                    latitude: lat,
                    longitude: lng
                }, {
                    onConflict: 'doctor_id'
                })

            if (error) {
                setErrorMsg('Erro ao salvar')
                return
            }

            setSuccess('Salvo com sucesso')

        } catch {
            setErrorMsg('Erro inesperado')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className='p-6'>Carregando...</div>

    return (
        <div className='p-6 max-w-xl mx-auto flex flex-col gap-6'>

            <div className='flex justify-between items-center'>
                <h1 className='text-xl font-semibold'>Alertas</h1>

                <button
                    onClick={async () => {
                        if (!profile?.id) return

                        const newValue = !enabled
                        setEnabled(newValue)

                        await supabase
                            .from('doctor_notification_preferences')
                            .upsert({
                                doctor_id: profile.id,
                                in_app_enabled: newValue
                            }, {
                                onConflict: 'doctor_id'
                            })
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md border transition
        ${enabled
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300'
                        }`}
                >
                    {enabled ? 'Filtro ativo' : 'Filtro desativado'}
                </button>
            </div>

            {enabled && (
                <div className='flex flex-col gap-5'>

                    <div className='border rounded-lg p-4 flex flex-col gap-3'>
                        <div className='text-sm font-medium text-gray-700'>Valor mínimo</div>
                        <input
                            type='number'
                            value={minValue}
                            onChange={e => setMinValue(e.target.value)}
                            className='w-full border p-2 rounded'
                        />
                    </div>

                    <div className='border rounded-lg p-4 flex flex-col gap-3'>
                        <div className='text-sm font-medium text-gray-700'>Especialidades</div>

                        <div className='grid grid-cols-2 gap-2'>
                            {SPECIALTIES.map(spec => (
                                <label key={spec} className='flex items-center gap-2 text-sm'>
                                    <input
                                        type='checkbox'
                                        checked={specialties.includes(spec)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSpecialties(prev => [...prev, spec])
                                            } else {
                                                setSpecialties(prev => prev.filter(s => s !== spec))
                                            }
                                        }}
                                    />
                                    {spec}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className='border rounded-lg p-4 flex flex-col gap-3'>
                        <div className='text-sm font-medium text-gray-700'>Localização (opcional)</div>

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

                                    const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`)
                                    if (!res.ok) return

                                    const data = await res.json()

                                    setSuggestions(
                                        (data || []).filter((item: any) =>
                                            item.properties?.city || item.properties?.name
                                        )
                                    )
                                }, 400)
                            }}
                            className='w-full border p-2 rounded'
                            placeholder='Digite a cidade'
                        />

                        {showSuggestions && suggestions.length > 0 && (
                            <div className='bg-white border rounded shadow'>
                                {suggestions.map((s, i) => (
                                    <div
                                        key={i}
                                        onClick={() => {
                                            const cityName = [
                                                s.properties?.city || s.properties?.name,
                                                s.properties?.state,
                                                s.properties?.country
                                            ].filter(Boolean).join(', ')

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
                                        ].filter(Boolean).join(', ')}
                                    </div>
                                ))}
                            </div>
                        )}

                        <input
                            type='number'
                            value={radius}
                            onChange={e => setRadius(e.target.value)}
                            className='w-full border p-2 rounded'
                            placeholder='Raio (km)'
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50'
                    >
                        {saving ? 'Salvando...' : 'Salvar'}
                    </button>

                    {success && <div className='text-green-600 text-sm'>{success}</div>}
                    {errorMsg && <div className='text-red-600 text-sm'>{errorMsg}</div>}
                </div>
            )}
        </div>
    )
}