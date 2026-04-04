'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Button from '@/components/ui/Button'

const Map = dynamic(() => import('@/components/Map'), {
    ssr: false
})

export default function ShiftDetailsPage() {
    const params = useParams()
    const id = params.id as string

    const [shift, setShift] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [accepting, setAccepting] = useState(false)

    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [crmStatus, setCrmStatus] = useState<'ok' | 'missing' | 'pending' | 'rejected'>('ok')
    const [approvedSpecialties, setApprovedSpecialties] = useState<string[]>([])

    const acceptShift = async () => {
        const confirmed = window.confirm('Deseja aceitar este plantão?')

        if (!confirmed) return

        setAccepting(true)
        setError('')

        const { data } = await supabase.auth.getUser()
        const user = data.user

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

        window.location.href = '/my-shifts'
    }

    useEffect(() => {

        const load = async () => {
            const { data: authData } = await supabase.auth.getUser()
            const user = authData.user

            setCurrentUserId(user?.id || null)
            if (user?.id) {
                const { data: specialties } = await supabase
                    .from('doctor_specialties')
                    .select('*')
                    .eq('doctor_id', user.id)

                setApprovedSpecialties(
                    (specialties || [])
                        .filter(s => s.approved)
                        .map(s => s.specialty)
                )
                const { data: doctor } = await supabase
                    .from('doctors')
                    .select('crm, crm_approved, crm_rejection_reason')
                    .eq('id', user.id)
                    .single()

                if (!doctor?.crm) {
                    setCrmStatus('missing')
                } else if (!doctor?.crm_approved) {
                    if (doctor?.crm_rejection_reason) {
                        setCrmStatus('rejected')
                    } else {
                        setCrmStatus('pending')
                    }
                } else {
                    setCrmStatus('ok')
                }
            }
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
    }, [id])

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
                {shift.requires_rqe && (
                    <div
                        className={`text-xs ${approvedSpecialties.includes(shift.specialty)
                            ? 'text-green-600'
                            : 'text-red-600'
                            }`}
                    >
                        Requer RQE aprovado em {shift.specialty}
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

                        window.location.href = '/my-shifts'
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
            />

            <Button
                onClick={() => {
                    window.location.href = '/shifts'
                }}
                variant='secondary'
            >
                Voltar
            </Button>

        </div>
    )
}