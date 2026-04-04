'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useShiftsPage } from '@/hooks/useShiftsPage'
import { useRouter } from 'next/navigation'

import { getDistanceKm } from '@/lib/utils/distance'
const Map = dynamic(() => import('@/components/Map'), {
    ssr: false
})

export default function ShiftDetailsPage() {
    const router = useRouter()
    const { crmStatus, approvedSpecialties } = useShiftsPage()
    const { user, profile, loading: authLoading } = useAuth()
    const params = useParams()
    const id = params.id as string

    const [shift, setShift] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [accepting, setAccepting] = useState(false)

    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [preferences, setPreferences] = useState<any>(null)

    const acceptShift = async () => {
        const confirmed = window.confirm('Deseja aceitar este plantão?')

        if (!confirmed) return

        setAccepting(true)
        setError('')

        if (!user) {
            setError('Não autenticado')
            setAccepting(false)
            return
        }

        const { error } = await supabase.rpc('accept_shift', {
            p_shift_id: shift.id,
            p_doctor_id: user.id
        })

        if (error) {
            setError('Alguém pegou antes')
            setAccepting(false)
            return
        }

        router.push('/my-shifts')
    }

    useEffect(() => {
        if (!user?.id) return

        const loadPreferences = async () => {
            const { data } = await supabase
                .from('doctor_notification_preferences')
                .select('*')
                .eq('doctor_id', user.id)
                .maybeSingle()

            setPreferences(data)
        }

        loadPreferences()
    }, [user?.id])

    useEffect(() => {
        if (authLoading) return

        const load = async () => {
            setLoading(true)
            setError('')

            setCurrentUserId(user?.id || null)


            const { data, error } = await supabase
                .from('shifts')
                .select(`
                *,
                clinics:clinic_id (
                    name,
                    address,
                    number,
                    complement,
                    city,
                    state
                )
            `)
                .eq('id', id)
                .single()

            if (error || !data) {
                setError('Plantão não encontrado')
                setLoading(false)
                return
            }

            setShift(data)
            setLoading(false)
        }

        load()
    }, [id, authLoading, user])

    if (loading) return <div>Carregando...</div>
    if (error) return <div className='text-red-500'>{error}</div>
    const isMine = shift?.accepted_doctor_id === currentUserId

    return (
        <div className='flex flex-col gap-4'>
            {error && <div className='text-red-500'>{error}</div>}
            {crmStatus === 'missing' && (
                <div className='bg-yellow-100 text-yellow-700 p-2 rounded'>
                    Você precisa preencher seu CRM no perfil para aceitar plantões
                </div>
            )}

            {crmStatus === 'pending' && (
                <div className='bg-yellow-100 text-yellow-700 p-2 rounded'>
                    Seu CRM está em análise pelo administrador
                </div>
            )}

            {crmStatus === 'rejected' && (
                <div className='bg-red-100 text-red-700 p-2 rounded'>
                    Seu CRM foi recusado. Atualize seu perfil para reenviar
                </div>
            )}
            <div className='bg-white border p-4 rounded flex flex-col gap-2'>
                <div className='text-lg font-semibold'>
                    {shift.specialty}
                </div>

                {shift.requires_rqe && (
                    <div
                        className={`text-xs ${approvedSpecialties.includes(shift.specialty)
                            ? 'text-green-600'
                            : 'text-red-600'
                            }`}
                    >
                        {approvedSpecialties.includes(shift.specialty)
                            ? `Você possui RQE aprovado em ${shift.specialty}`
                            : `Você não possui RQE aprovado em ${shift.specialty}`}
                    </div>
                )}

                <div className='text-xl font-bold'>
                    R$ {Number(shift.value).toFixed(2)}
                </div>

                <div className='text-sm text-gray-600'>
                    <p><b>Clínica:</b> {shift.clinics?.name}</p>

                    <p>
                        <b>Endereço:</b>{' '}
                        {shift.clinics
                            ? `${shift.clinics.address}, ${shift.clinics.number}${shift.clinics.complement ? ' - ' + shift.clinics.complement : ''} - ${shift.clinics.city}/${shift.clinics.state}`
                            : '-'}
                    </p>

                    <p>
                        <b>Início:</b> {new Date(shift.start_time).toLocaleString()}
                    </p>

                    <p>
                        <b>Fim:</b> {new Date(shift.end_time).toLocaleString()}
                    </p>
                    <p>
                        <b>Distância:</b>{' '}
                        {preferences?.latitude && preferences?.longitude
                            ? Math.round(
                                getDistanceKm(
                                    preferences.latitude,
                                    preferences.longitude,
                                    shift.latitude,
                                    shift.longitude
                                )
                            ) + ' km'
                            : '-'}
                    </p>
                </div>

            </div>
            {isMine ? (
                <Button
                    variant='secondary'
                    onClick={async () => {
                        const confirmed = window.confirm('Deseja cancelar este plantão?')
                        if (!confirmed) return

                        await supabase
                            .from('shifts')
                            .update({
                                status: 'open',
                                accepted_doctor_id: null
                            })
                            .eq('id', shift.id)

                        router.push('/my-shifts')
                    }}
                >
                    Cancelar plantão
                </Button>
            ) : (
                <Button
                    onClick={acceptShift}
                    disabled={
                        accepting ||
                        crmStatus !== 'ok' ||
                        (shift.requires_rqe && !approvedSpecialties.includes(shift.specialty))
                    }
                >
                    {accepting ? 'Aceitando...' : 'Aceitar plantão'}
                </Button>
            )}
            <Map
                shifts={[shift]}
                selectedShiftId={shift.id}
                onSelect={() => { }}
                centerLat={preferences?.latitude}
                centerLng={preferences?.longitude}
                radiusKm={preferences?.radius_km}
            />

            <Button
                onClick={() => {
                    router.push('/shifts')
                }}
                variant='secondary'
            >
                Voltar
            </Button>

        </div>
    )
}