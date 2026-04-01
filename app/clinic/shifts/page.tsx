'use client'

import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { useEffect } from 'react'
import { useRef } from 'react'

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
      .select('*')
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
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const deleteShift = async (id: string) => {
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
      const res = await supabase
        .from('shifts')
        .update({
          specialty,
          start_time: new Date(start),
          end_time: new Date(end),
          value: Number(value)
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
        longitude: clinic.longitude
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
    await loadShifts(user.id)
  }

  return (
    <div ref={formRef} className='p-10 flex flex-col gap-2'>
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

      <input
        placeholder='Valor'
        value={value}
        onChange={e => setValue(e.target.value)}
        className='border p-2 rounded bg-white text-black'
      />

      <input
        type="datetime-local"
        value={start}
        onChange={e => setStart(e.target.value)}
        className="border p-2 rounded bg-white text-black"
      />

      <input
        type="datetime-local"
        value={end}
        onChange={e => setEnd(e.target.value)}
        className="border p-2 rounded bg-white text-black"
      />

      <button
        onClick={handleCreate}
        disabled={submitting || loading}
        className='p-2 bg-purple-600 text-white rounded disabled:opacity-50'
      >
        {submitting
          ? editingId ? 'Salvando...' : 'Criando...'
          : editingId ? 'Salvar alterações' : 'Criar plantão'}
      </button>
      <div className='mt-6'>
        <h2 className='font-bold text-lg mb-2'>Seus plantões</h2>

        {!loading && shifts.length === 0 && (
          <div className='text-gray-500'>Nenhum plantão criado</div>
        )}
        {loading && (
          <div className='text-gray-500'>Carregando...</div>
        )}

        {shifts.map(shift => (
          <div key={shift.id} className='border p-3 mb-2 rounded bg-white text-black'>
            <p><b>Especialidade:</b> {shift.specialty}</p>
            <p><b>Valor:</b> R$ {shift.value}</p>
            <p><b>Início:</b> {new Date(shift.start_time).toLocaleString()}</p>
            <p><b>Fim:</b> {new Date(shift.end_time).toLocaleString()}</p>
            <p>
              <b>Status:</b>{' '}
              <span className={shift.status === 'open' ? 'text-yellow-600' : 'text-green-600'}>
                {shift.status}
              </span>
            </p>
            {shift.status === 'accepted' && shift.accepted_doctor && (
              <div className='mt-2 p-2 bg-green-50 rounded'>
                <p><b>Médico:</b> {shift.accepted_doctor.name}</p>
                <p><b>CRM:</b> {shift.accepted_doctor.crm}</p>
              </div>
            )}
            {shift.status === 'open' && (
              <div className='flex gap-2 mt-2'>
                <button
                  onClick={() => startEdit(shift)}
                  className='p-2 bg-blue-600 text-white rounded'
                >
                  Editar
                </button>

                <button
                  onClick={() => deleteShift(shift.id)}
                  className='p-2 bg-red-600 text-white rounded'
                >
                  Excluir
                </button>
              </div>
            )}
          </div>

        ))}
      </div>
    </div>
  )
}