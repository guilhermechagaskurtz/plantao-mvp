/*
app/doctor/profile/page.tsx
*/
'use client'

import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { SPECIALTIES } from '@/lib/specialties'

export default function DoctorPage() {
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

  const [specialtiesList, setSpecialtiesList] = useState<
    { specialty: string; rqe: string; approved?: boolean; rejection_reason?: string }[]
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
    const load = async () => {
      setLoading(true)
      setError('')

      const { data } = await supabase.auth.getUser()
      const user = data.user

      if (!user) {
        setError('Usuário não autenticado')
        setLoading(false)
        return
      }

      const { data: doctor } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', user.id)
        .single()

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

      const loadSpecialties = async (userId: string) => {
        const { data: specialtiesData } = await supabase
          .from('doctor_specialties')
          .select('*')
          .eq('doctor_id', userId)

        if (specialtiesData) {
          setSpecialtiesList(
            specialtiesData.map(s => ({
              specialty: s.specialty,
              rqe: s.rqe,
              approved: s.approved,
              rejection_reason: s.rejection_reason
            }))
          )
        }
      }
      await loadSpecialties(user.id)

      const { data: interestsData } = await supabase
        .from('doctor_interests')
        .select('*')
        .eq('doctor_id', user.id)

      if (interestsData) {
        setInterests(interestsData.map(i => i.specialty))
      }

      setLoading(false)
    }

    load()
  }, [])

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

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) {
      setError('Usuário não autenticado')
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('doctors').upsert({
      id: user.id,
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
    const specialtiesNames = validSpecialties.map(s => s.specialty)
    const hasDuplicates = new Set(specialtiesNames).size !== specialtiesNames.length

    if (hasDuplicates) {
      setError('Não é permitido repetir especialidades')
      setSubmitting(false)
      return
    }

    const { data: existing } = await supabase
      .from('doctor_specialties')
      .select('*')
      .eq('doctor_id', user.id)

    for (const spec of validSpecialties) {
      const found = existing?.find(e => e.specialty === spec.specialty)

      if (!found) {
        await supabase.from('doctor_specialties').insert({
          doctor_id: user.id,
          specialty: spec.specialty,
          rqe: spec.rqe,
          approved: false,
          rejection_reason: null
        })
      } else if (found.rqe !== spec.rqe) {
        await supabase
          .from('doctor_specialties')
          .update({
            rqe: spec.rqe,
            approved: false,
            rejection_reason: null
          })
          .eq('id', found.id)
      }
    }

    const keep = validSpecialties.map(s => s.specialty)

    for (const old of existing || []) {
      if (!keep.includes(old.specialty)) {
        await supabase
          .from('doctor_specialties')
          .delete()
          .eq('id', old.id)
      }
    }

    await supabase
      .from('doctor_interests')
      .delete()
      .eq('doctor_id', user.id)

    if (interests.length > 0) {
      const { error: intError } = await supabase
        .from('doctor_interests')
        .insert(
          interests.map(i => ({
            doctor_id: user.id,
            specialty: i
          }))
        )

      if (intError) {
        setError(intError.message)
        setSubmitting(false)
        return
      }
    }

    setSuccess('Dados salvos com sucesso')

    const { data: refreshed } = await supabase
      .from('doctor_specialties')
      .select('*')
      .eq('doctor_id', user.id)

    if (refreshed) {
      setSpecialtiesList(
        refreshed.map(s => ({
          specialty: s.specialty,
          rqe: s.rqe,
          approved: s.approved,
          rejection_reason: s.rejection_reason
        }))
      )
    }

    setSubmitting(false)

  }

  return (
    <div className='flex flex-col gap-6 items-center'>
      {error && <div className='bg-red-100 text-red-700 p-3 rounded'>{error}</div>}
      {success && <div className='bg-green-100 text-green-700 p-3 rounded'>{success}</div>}
      {loading && <div className='text-gray-500'>Carregando...</div>}

      <div className='bg-white border rounded-lg shadow-sm p-6 flex flex-col gap-4 max-w-2xl w-full'>
        <h1 className='text-xl font-bold'>Perfil do médico</h1>

        <input placeholder='Nome' value={name} onChange={e => setName(e.target.value)} className='border p-2 rounded w-full' />
        <input placeholder='CRM' value={crm} onChange={e => setCrm(e.target.value)} className='border p-2 rounded w-full' />
        <div className='text-sm'>
          {!crm && (
            <span className='text-yellow-600'>
              Você precisa informar seu CRM
            </span>
          )}

          {crm && !crmApproved && !crmRejectionReason && (
            <span className='text-yellow-600'>
              Seu CRM está em análise
            </span>
          )}

          {crm && !crmApproved && crmRejectionReason && (
            <span className='text-red-600'>
              CRM recusado: {crmRejectionReason}
            </span>
          )}

          {crm && crmApproved && (
            <span className='text-green-600'>
              CRM aprovado
            </span>
          )}
        </div>
        <input placeholder='Telefone' value={phone} onChange={e => setPhone(e.target.value)} className='border p-2 rounded w-full' />
        <input placeholder='Documento' value={document} onChange={e => setDocument(e.target.value)} className='border p-2 rounded w-full' />
        <textarea placeholder='Sobre você' value={bio} onChange={e => setBio(e.target.value)} className='border p-2 rounded w-full' />

        {/* ESPECIALIDADES */}
        <div className='flex flex-col gap-2'>
          <div className='flex justify-between'>
            <h2 className='font-semibold'>Especialidades</h2>
            <button onClick={addSpecialty} className='text-blue-600 text-sm'>Adicionar</button>
          </div>

          {specialtiesList.map((item, index) => (
            <div key={index} className='flex flex-col gap-1 border p-2 rounded'>
              <div className='flex gap-2 items-center'>
                <select
                  value={item.specialty}
                  onChange={e => updateSpecialty(index, 'specialty', e.target.value)}
                  className='border p-2 rounded w-full'
                >
                  <option value=''>Selecione</option>
                  {SPECIALTIES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <input
                  placeholder='RQE'
                  value={item.rqe}
                  onChange={e => updateSpecialty(index, 'rqe', e.target.value)}
                  className='border p-2 rounded w-32'
                />

                <button
                  onClick={() => removeSpecialty(index)}
                  className='text-red-600 font-bold px-2'
                >
                  X
                </button>
              </div>
              <div className='text-sm'>
                {item.approved ? (
                  <span className='text-green-600'>RQE aprovado</span>
                ) : item.rejection_reason ? (
                  <span className='text-red-600'>
                    RQE recusado: {item.rejection_reason}
                  </span>
                ) : (
                  <span className='text-yellow-600'>RQE em análise</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* INTERESSES */}
        <div className='flex flex-col gap-2'>
          <h2 className='font-semibold'>Áreas de interesse</h2>

          <div className='flex flex-wrap gap-2'>
            {SPECIALTIES.map(s => (
              <label key={s} className='text-sm flex gap-1 items-center'>
                <input
                  type='checkbox'
                  checked={interests.includes(s)}
                  onChange={(e) => {
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
          onClick={handleSave}
          disabled={submitting || loading}
          className='bg-blue-600 text-white p-2 rounded'
        >
          {submitting ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}