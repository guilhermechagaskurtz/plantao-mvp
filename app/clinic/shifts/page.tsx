/*
app/clinic/shifts/page.tsx
*/
'use client'

import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { useEffect } from 'react'
import { useRef } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Section from '@/components/ui/Section'

const specialties = [
  'Clínico Geral',
  'Cardiologia',
  'Pediatria',
  'Ortopedia',
  'Ginecologia',
  'Dermatologia',
  'Psiquiatria'
]

export default function CreateShift() {
  const [specialty, setSpecialty] = useState('')
  const [value, setValue] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [clinic, setClinic] = useState<any>(null)
  const [shifts, setShifts] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement | null>(null)
  const [requiresRqe, setRequiresRqe] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')

      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user

      if (!user) {
        setError('Usuário não autenticado')
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile?.type !== 'clinic') {
        window.location.href = '/shifts'
        return
      }

      const { data: clinic } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!clinic) {
        setError('Clínica não encontrada')
        setLoading(false)
        return
      }

      setClinic(clinic)
      await loadShifts(clinic.id)
      setLoading(false)
    }

    load()
  }, [])

  const loadShifts = async (clinicId: string) => {
    const { data, error } = await supabase
      .from('shifts')
      .select(`
    *,
    doctors:accepted_doctor_id (
      id,
      name,
      crm
    )
  `)
      .eq('clinic_id', clinicId)
      .order('start_time', { ascending: false })

    if (error) {
      setError(error.message)
      return
    }

    if (data) {
      setShifts(data)
    }
  }

  const startEdit = (shift: any) => {
    if (shift.status !== 'open') return

    setEditingId(shift.id)
    setSpecialty(shift.specialty)
    setValue(String(shift.value))
    setStart(new Date(shift.start_time).toISOString().slice(0, 16))
    setEnd(new Date(shift.end_time).toISOString().slice(0, 16))
    setRequiresRqe(shift.requires_rqe || false)
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const deleteShift = async (id: string) => {
    const shift = shifts.find(s => s.id === id)

    if (shift?.status !== 'open') {
      setError('Não é possível remover um plantão já aceito')
      return
    }

    setError('')
    setSuccess('')

    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    setShifts(prev => prev.filter(s => s.id !== id))
    setSuccess('Plantão removido')
  }

  const handleCreate = async () => {
    const confirmed = window.confirm(
      editingId
        ? 'Deseja salvar as alterações deste plantão?'
        : 'Deseja criar este plantão?'
    )

    if (!confirmed) return
    setError('')
    setSuccess('')

    if (!clinic) {
      setError('Clínica não carregada')
      return
    }

    if (!specialty) {
      setError('Informe a especialidade')
      return
    }

    if (!value || Number(value) <= 0) {
      setError('Valor inválido')
      return
    }

    if (!start || !end) {
      setError('Preencha data e horário')
      return
    }

    if (new Date(end) <= new Date(start)) {
      setError('Horário final inválido')
      return
    }
    if (new Date(start) <= new Date()) {
      setError('Não é possível criar plantões no passado')
      return
    }

    setSubmitting(true)

    const { data } = await supabase.auth.getUser()
    const user = data.user

    if (!user) {
      setError('Não autenticado')
      setSubmitting(false)
      return
    }

    let error

    if (editingId) {
      const shift = shifts.find(s => s.id === editingId)

      if (shift?.status !== 'open') {
        setError('Não é possível editar um plantão já aceito')
        setSubmitting(false)
        return
      }

      const res = await supabase
        .from('shifts')
        .update({
          specialty,
          start_time: new Date(start),
          end_time: new Date(end),
          value: Number(value),
          requires_rqe: requiresRqe
        })
        .eq('id', editingId)

      error = res.error
    } else {
      const res = await supabase.from('shifts').insert({
        clinic_id: user.id,
        specialty,
        start_time: new Date(start),
        end_time: new Date(end),
        value: Number(value),

        latitude: clinic.latitude,
        longitude: clinic.longitude,

        address: clinic.address,
        number: clinic.number,
        complement: clinic.complement,
        city: clinic.city,
        state: clinic.state,
        requires_rqe: requiresRqe
      })

      error = res.error
    }

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    setSuccess(editingId ? 'Plantão atualizado' : 'Plantão criado com sucesso')
    setEditingId(null)
    setSubmitting(false)

    setSpecialty('')
    setValue('')
    setStart('')
    setEnd('')
    setRequiresRqe(false)
    await loadShifts(user.id)
  }

  return (
    <div ref={formRef} className='flex flex-col gap-X'>
      {error && (
        <div className='bg-red-100 text-red-700 p-2 rounded'>
          {error}
        </div>
      )}

      {success && (
        <div className='bg-green-100 text-green-700 p-2 rounded'>
          {success}
        </div>
      )}

      {loading && (
        <div className='text-gray-500'>Carregando...</div>
      )}
      <Card>
        <div className='mb-4'>
          <h2 className='text-lg font-semibold text-gray-900'>
            {editingId ? 'Editar plantão' : 'Criar novo plantão'}
          </h2>
          <p className='text-sm text-gray-500'>
            Preencha os dados do plantão abaixo
          </p>
        </div>
        <div className='flex flex-col gap-3'>
          <select
            value={specialty}
            onChange={e => setSpecialty(e.target.value)}
            className='p-2 bg-blue-600 text-white rounded'
          >
            <option value=''>Selecione a especialidade</option>

            {specialties.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <label className='flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={requiresRqe}
              disabled={!specialty}
              onChange={e => setRequiresRqe(e.target.checked)}
            />
            Requer RQE
          </label>
          {!specialty && (
            <span className='text-xs text-gray-400'>
              Selecione uma especialidade para exigir RQE
            </span>
          )}
          <Input
            value={value}
            onChange={setValue}
            placeholder='Valor'
          />

          <Input
            type='datetime-local'
            value={start}
            onChange={setStart}
          />

          <Input
            type='datetime-local'
            value={end}
            onChange={setEnd}
          />

          <Button
            onClick={handleCreate}
            disabled={submitting || loading}
          >
            {submitting
              ? editingId ? 'Salvando...' : 'Criando...'
              : editingId ? 'Salvar alterações' : 'Criar plantão'}
          </Button>
        </div>

      </Card>
      <Card className='mt-6'>
        <div className='flex justify-between items-center mb-3'>
          <h2 className='text-lg font-semibold'>Seus plantões</h2>
        </div>

        {!loading && shifts.length === 0 && (
          <div className='text-gray-500'>Nenhum plantão criado</div>
        )}
        {loading && (
          <div className='text-gray-500'>Carregando...</div>
        )}

        {shifts.map(shift => (
          <div
            key={shift.id}
            className='border border-gray-200 p-4 rounded-lg bg-white hover:shadow-sm transition flex flex-col gap-2'
          >
            <div className='flex justify-between items-center'>
              <div className='flex flex-col'>
                <div className='font-semibold text-gray-900'>
                  {shift.specialty}
                </div>

                {shift.requires_rqe && (
                  <span className='text-xs text-red-600'>
                    Requer RQE
                  </span>
                )}
              </div>

              <span className={`text-xs font-medium px-2 py-1 rounded 
      ${shift.status === 'open'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'}
    `}>
                {shift.status}
              </span>
            </div>

            <div className='text-sm text-gray-600'>
              <div><b>Valor:</b> R$ {shift.value}</div>
              <div><b>Início:</b> {new Date(shift.start_time).toLocaleString()}</div>
              <div><b>Fim:</b> {new Date(shift.end_time).toLocaleString()}</div>
            </div>

            {shift.status === 'accepted' && shift.doctors && (
              <div className='text-sm bg-gray-50 p-2 rounded'>
                <b>Médico:</b> {shift.doctors.name} ({shift.doctors.crm})
              </div>
            )}

            {shift.status === 'open' && (
              <div className='flex gap-2 mt-2'>
                <Button
                  variant='secondary'
                  onClick={() => startEdit(shift)}
                >
                  Editar
                </Button>

                <Button
                  variant='danger'
                  onClick={() => deleteShift(shift.id)}
                >
                  Excluir
                </Button>
              </div>
            )}
          </div>

        ))}
      </Card>
    </div >
  )
}