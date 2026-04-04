/*
admin/doctors/[id]/page.tsx
*/
'use client'

import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SPECIALTIES } from '@/lib/specialties'
import { useAuth } from '@/hooks/useAuth'

export default function AdminDoctorEditPage() {
    const { user, profile, loading: authLoading } = useAuth()
    const params = useParams()
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const router = useRouter()

    const [name, setName] = useState('')
    const [crm, setCrm] = useState('')
    const [phone, setPhone] = useState('')
    const [document, setDocument] = useState('')
    const [bio, setBio] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [radiusKm, setRadiusKm] = useState(10)
    const [crmApproved, setCrmApproved] = useState(false)
    const [crmRejectionReason, setCrmRejectionReason] = useState('')
    const [errorMsg, setErrorMsg] = useState('')

    const [specialtiesList, setSpecialtiesList] = useState<
        { id?: string; specialty: string; rqe: string; approved?: boolean; rejection_reason?: string }[]
    >([])

    const [interests, setInterests] = useState<string[]>([])

    const addSpecialty = () => {
        setSpecialtiesList(prev => [...prev, { specialty: '', rqe: '' }])
    }

    const removeSpecialty = (index: number) => {
        setSpecialtiesList(prev => prev.filter((_, i) => i !== index))
    }

    const updateSpecialty = (
        index: number,
        field: 'specialty' | 'rqe',
        value: string
    ) => {
        setSpecialtiesList(prev =>
            prev.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        )
    }

    useEffect(() => {
        if (authLoading) return

        if (!user || profile?.type !== 'admin') {
            window.location.href = '/login'
            return
        }

        const load = async () => {
            setLoading(true)
            setError('')

            const { data: doctor, error: doctorError } = await supabase
                .from('doctors')
                .select('*')
                .eq('id', id)
                .single()

            if (doctorError) {
                setError(doctorError.message)
                setLoading(false)
                return
            }

            if (doctor) {
                setCrmApproved(doctor.crm_approved ?? false)
                setCrmRejectionReason(doctor.crm_rejection_reason || '')
                setName(doctor.name || '')
                setCrm(doctor.crm || '')
                setPhone(doctor.phone || '')
                setDocument(doctor.document || '')
                setBio(doctor.bio || '')
                setRadiusKm(doctor.radius_km || 10)
            }

            const { data: specialtiesData, error: specialtiesError } = await supabase
                .from('doctor_specialties')
                .select('*')
                .eq('doctor_id', id)

            if (specialtiesError) {
                setError(specialtiesError.message)
                setLoading(false)
                return
            }

            if (specialtiesData) {
                setSpecialtiesList(
                    specialtiesData.map(s => ({
                        id: s.id,
                        specialty: s.specialty,
                        rqe: s.rqe,
                        approved: s.approved,
                        rejection_reason: s.rejection_reason
                    }))
                )
            }

            const { data: interestsData, error: interestsError } = await supabase
                .from('doctor_interests')
                .select('*')
                .eq('doctor_id', id)

            if (interestsError) {
                setError(interestsError.message)
                setLoading(false)
                return
            }

            if (interestsData) {
                setInterests(interestsData.map(i => i.specialty))
            }

            setLoading(false)
        }

        load()
    }, [id, authLoading, user, profile])

    const handleSave = async () => {
        setError('')
        setSuccess('')

        if (!name) {
            setError('Informe o nome')
            return
        }

        if (!crm) {
            setError('Informe o CRM')
            return
        }

        setSubmitting(true)

        const { error } = await supabase.from('doctors').upsert({
            id,
            name,
            crm,
            phone,
            document,
            bio,
            radius_km: radiusKm
        })

        if (error) {
            setError(error.message)
            setSubmitting(false)
            return
        }

        const validSpecialties = specialtiesList.filter(
            s => s.specialty && s.rqe
        )

        if (specialtiesList.length > 0 && validSpecialties.length === 0) {
            setError('Preencha especialidade e RQE corretamente')
            setSubmitting(false)
            return
        }

        // separar existentes e novos
        const existing = validSpecialties.filter(s => s.id)
        const news = validSpecialties.filter(s => !s.id)

        // UPDATE (mantém approved / rejection_reason)
        for (const s of existing) {
            const { error: updateError } = await supabase
                .from('doctor_specialties')
                .update({
                    specialty: s.specialty,
                    rqe: s.rqe
                })
                .eq('id', s.id)

            if (updateError) {
                setError(updateError.message)
                setSubmitting(false)
                return
            }
        }

        // INSERT (novos começam pendentes naturalmente)
        if (news.length > 0) {
            const { error: insertError } = await supabase
                .from('doctor_specialties')
                .insert(
                    news.map(s => ({
                        doctor_id: id,
                        specialty: s.specialty,
                        rqe: s.rqe
                    }))
                )

            if (insertError) {
                setError(insertError.message)
                setSubmitting(false)
                return
            }
        }

        // DELETE seletivo (removidos pelo usuário)
        const idsInForm = existing.map(s => s.id)

        const idsInDb = specialtiesList
            .filter(s => s.id)
            .map(s => s.id)

        const toDelete = idsInDb.filter(dbId => !idsInForm.includes(dbId))

        if (toDelete.length > 0) {
            const { error: deleteError } = await supabase
                .from('doctor_specialties')
                .delete()
                .in('id', toDelete)

            if (deleteError) {
                setError(deleteError.message)
                setSubmitting(false)
                return
            }
        }

        const { error: deleteInterestsError } = await supabase
            .from('doctor_interests')
            .delete()
            .eq('doctor_id', id)

        if (deleteInterestsError) {
            setError(deleteInterestsError.message)
            setSubmitting(false)
            return
        }

        // pegar interesses atuais do banco
        const { data: existingInterests, error: fetchInterestsError } = await supabase
            .from('doctor_interests')
            .select('id, specialty')
            .eq('doctor_id', id)

        if (fetchInterestsError) {
            setError(fetchInterestsError.message)
            setSubmitting(false)
            return
        }

        const existingSet = new Set((existingInterests || []).map(i => i.specialty))
        const newSet = new Set(interests)

        // INSERT novos
        const toInsert = interests.filter(i => !existingSet.has(i))

        if (toInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('doctor_interests')
                .insert(
                    toInsert.map(i => ({
                        doctor_id: id,
                        specialty: i
                    }))
                )

            if (insertError) {
                setError(insertError.message)
                setSubmitting(false)
                return
            }
        }

        // DELETE removidos
        const interestIdsToDelete = (existingInterests || [])
            .filter(i => !newSet.has(i.specialty))
            .map(i => i.id)

        if (interestIdsToDelete.length > 0) {
            const { error: deleteError } = await supabase
                .from('doctor_interests')
                .delete()
                .in('id', interestIdsToDelete)

            if (deleteError) {
                setError(deleteError.message)
                setSubmitting(false)
                return
            }
        }

        setSuccess('Dados salvos com sucesso')
        setSubmitting(false)

        setTimeout(() => {
            router.replace(`/admin/doctors/${id}`)
        }, 1000)
    }

    return (
        <div className='flex flex-col gap-6 items-center'>
            {error && <div className='bg-red-100 text-red-700 p-3 rounded'>{error}</div>}
            {errorMsg && (
                <div className='bg-red-100 text-red-700 p-2 rounded mb-4'>
                    {errorMsg}
                </div>
            )}
            {success && <div className='bg-green-100 text-green-700 p-3 rounded'>{success}</div>}
            {loading && <div className='text-gray-500'>Carregando...</div>}

            <div className='bg-white border rounded-lg shadow-sm p-6 flex flex-col gap-4 max-w-2xl w-full'>
                <h1 className='text-xl font-bold'>Editar médico</h1>

                <input
                    placeholder='Nome'
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className='border p-2 rounded w-full'
                />

                <input
                    placeholder='CRM'
                    value={crm}
                    onChange={e => setCrm(e.target.value)}
                    className='border p-2 rounded w-full'
                />

                <div className='text-sm'>
                    {crmApproved ? (
                        <span className='text-green-600'>CRM aprovado</span>
                    ) : crmRejectionReason ? (
                        <span className='text-red-600'>
                            CRM reprovado: {crmRejectionReason}
                        </span>
                    ) : (
                        <span className='text-yellow-600'>CRM pendente</span>
                    )}
                </div>

                <input
                    placeholder='Telefone'
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className='border p-2 rounded w-full'
                />

                <input
                    placeholder='Documento'
                    value={document}
                    onChange={e => setDocument(e.target.value)}
                    className='border p-2 rounded w-full'
                />

                <textarea
                    placeholder='Sobre o médico'
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className='border p-2 rounded w-full'
                />

                <div className='flex flex-col gap-2'>
                    <div className='flex justify-between'>
                        <h2 className='font-semibold'>Especialidades</h2>
                        <button
                            type='button'
                            onClick={addSpecialty}
                            className='text-blue-600 text-sm'
                        >
                            Adicionar
                        </button>
                    </div>

                    {specialtiesList.map((item, index) => (
                        <div key={index} className='flex flex-col gap-2 border p-2 rounded'>
                            <div className='flex gap-2'>
                                <select
                                    disabled={item.approved}
                                    value={item.specialty}
                                    onChange={e => updateSpecialty(index, 'specialty', e.target.value)}
                                    className='border p-2 rounded w-full'
                                >
                                    <option value=''>Selecione</option>
                                    {SPECIALTIES.map(s => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    placeholder='RQE'
                                    disabled={item.approved}
                                    value={item.rqe}
                                    onChange={e => updateSpecialty(index, 'rqe', e.target.value)}
                                    className='border p-2 rounded w-32'
                                />

                                {!item.approved && (
                                    <button
                                        type='button'
                                        onClick={() => removeSpecialty(index)}
                                        className='text-red-600'
                                    >
                                        X
                                    </button>
                                )}
                            </div>

                            <div className='text-sm'>
                                {item.approved ? (
                                    <span className='text-green-600'>RQE aprovado</span>
                                ) : item.rejection_reason ? (
                                    <span className='text-red-600'>
                                        RQE reprovado: {item.rejection_reason}
                                    </span>
                                ) : (
                                    <span className='text-yellow-600'>RQE pendente</span>
                                )}
                            </div>

                            {item.id ? (
                                <div className='flex gap-2'>
                                    <button
                                        type='button'
                                        onClick={async () => {
                                            const { error } = await supabase
                                                .from('doctor_specialties')
                                                .update({
                                                    approved: true,
                                                    rejection_reason: null
                                                })
                                                .eq('id', item.id)

                                            if (error) {
                                                setError(error.message)
                                                return
                                            }

                                            setSpecialtiesList(prev =>
                                                prev.map((s, i) => {
                                                    if (i === index) {
                                                        return {
                                                            ...s,
                                                            approved: true,
                                                            rejection_reason: ''
                                                        }
                                                    }
                                                    return s
                                                })
                                            )

                                            setSuccess('RQE aprovado')
                                            setErrorMsg('')
                                            window.scrollTo({ top: 0, behavior: 'smooth' })
                                        }}
                                        className='bg-green-600 text-white px-2 py-1 rounded text-xs'
                                    >
                                        Aprovar
                                    </button>

                                    <button
                                        type='button'
                                        onClick={async () => {
                                            const reason = window.prompt('Motivo da reprovação:')
                                            if (!reason) return

                                            const { error } = await supabase
                                                .from('doctor_specialties')
                                                .update({
                                                    approved: false,
                                                    rejection_reason: reason
                                                })
                                                .eq('id', item.id)

                                            if (error) {
                                                setError(error.message)
                                                return
                                            }

                                            setSpecialtiesList(prev =>
                                                prev.map((s, i) => {
                                                    if (i === index) {
                                                        return {
                                                            ...s,
                                                            approved: false,
                                                            rejection_reason: reason
                                                        }
                                                    }
                                                    return s
                                                })
                                            )

                                            setErrorMsg('RQE reprovado')
                                            setSuccess('')
                                            window.scrollTo({ top: 0, behavior: 'smooth' })
                                        }}
                                        className='bg-red-600 text-white px-2 py-1 rounded text-xs'
                                    >
                                        Reprovar
                                    </button>
                                </div>
                            ) : (
                                <div className='text-xs text-gray-400'>
                                    Salve para habilitar aprovação
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className='flex flex-col gap-2'>
                    <h2 className='font-semibold'>Áreas de interesse</h2>

                    <div className='flex flex-wrap gap-2'>
                        {SPECIALTIES.map(s => (
                            <label key={s} className='text-sm flex gap-1 items-center'>
                                <input
                                    type='checkbox'
                                    checked={interests.includes(s)}
                                    onChange={e => {
                                        if (e.target.checked) {
                                            setInterests(prev => [...prev, s])
                                        } else {
                                            setInterests(prev => prev.filter(i => i !== s))
                                        }
                                    }}
                                />
                                {s}
                            </label>
                        ))}
                    </div>
                </div>

                <div className='flex flex-col gap-1'>
                    <label className='text-sm text-gray-600'>
                        Raio de atuação (km)
                    </label>

                    <input
                        type='number'
                        min={1}
                        max={100}
                        value={radiusKm}
                        onChange={e => setRadiusKm(Number(e.target.value))}
                        className='border p-2 rounded w-full'
                    />
                </div>

                <button
                    type='button'
                    onClick={async () => {
                        const confirmed = window.confirm('Aprovar CRM deste médico?')
                        if (!confirmed) return

                        const { error } = await supabase
                            .from('doctors')
                            .update({
                                crm_approved: true,
                                crm_rejection_reason: null
                            })
                            .eq('id', id)

                        if (error) {
                            setError(error.message)
                            return
                        }

                        setCrmApproved(true)
                        setCrmRejectionReason('')
                        setSuccess('CRM aprovado com sucesso')
                        setErrorMsg('')
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className='bg-green-600 text-white p-2 rounded'
                >
                    Aprovar CRM
                </button>

                <button
                    type='button'
                    onClick={async () => {
                        const reason = window.prompt('Motivo da reprovação:')
                        if (!reason) return

                        const { error } = await supabase
                            .from('doctors')
                            .update({
                                crm_approved: false,
                                crm_rejection_reason: reason
                            })
                            .eq('id', id)

                        if (error) {
                            setError(error.message)
                            return
                        }

                        setCrmApproved(false)
                        setCrmRejectionReason(reason)
                        setErrorMsg('CRM reprovado')
                        setSuccess('')
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className='bg-red-600 text-white p-2 rounded'
                >
                    Reprovar CRM
                </button>

                <button
                    onClick={handleSave}
                    disabled={submitting || loading}
                    className='bg-blue-600 text-white p-2 rounded'
                >
                    {submitting ? 'Salvando...' : 'Salvar'}
                </button>

                <button
                    type='button'
                    onClick={() => router.push('/admin/doctors')}
                    className='bg-gray-400 text-white p-2 rounded'
                >
                    Voltar
                </button>
            </div>
        </div>
    )
}