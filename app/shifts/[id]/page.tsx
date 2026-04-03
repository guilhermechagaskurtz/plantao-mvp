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
            <div className='bg-white border p-4 rounded flex flex-col gap-2'>
                <div className='text-lg font-semibold'>
                    {shift.specialty}
                </div>

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
                    disabled={accepting}
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