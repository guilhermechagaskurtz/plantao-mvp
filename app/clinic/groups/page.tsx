'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

type DoctorGroup = {
    id: string
    clinic_id: string
    name: string
    code: string
    created_at: string
    doctor_group_members?: any[]
}

type Doctor = {
    id: string
    name: string | null
    crm: string | null
}

export default function ClinicGroupsPage() {
    const { user } = useAuth()

    const [groups, setGroups] = useState<DoctorGroup[]>([])
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

    const [name, setName] = useState('')
    const [code, setCode] = useState('')

    const [editingId, setEditingId] = useState<string | null>(null)

    const [members, setMembers] = useState<any[]>([])
    const [doctorSearch, setDoctorSearch] = useState('')
    const [doctorResults, setDoctorResults] = useState<Doctor[]>([])

    const [loading, setLoading] = useState(true)
    const [membersLoading, setMembersLoading] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)
    const [error, setError] = useState('')

    const selectedGroup = useMemo(() => {
        return groups.find(g => g.id === selectedGroupId) || null
    }, [groups, selectedGroupId])

    const loadGroups = async () => {
        if (!user) return

        setLoading(true)
        setError('')

        const { data, error } = await supabase
            .from('doctor_groups')
            .select(`
                *,
                doctor_group_members (
                    id
                )
            `)
            .eq('clinic_id', user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        setGroups(data || [])

        if (!selectedGroupId && data && data.length > 0) {
            setSelectedGroupId(data[0].id)
        }

        setLoading(false)
    }

    const loadMembers = async (groupId: string) => {
        setMembersLoading(true)
        setError('')

        const { data, error } = await supabase
            .from('doctor_group_members')
            .select(`
                id,
                doctor_id,
                doctors (
                    id,
                    name,
                    crm
                )
            `)
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })

        if (error) {
            setError(error.message)
            setMembersLoading(false)
            return
        }

        setMembers(data || [])
        setMembersLoading(false)
    }

    useEffect(() => {
        if (!user) return
        loadGroups()
    }, [user])

    useEffect(() => {
        if (!selectedGroupId) {
            setMembers([])
            return
        }

        loadMembers(selectedGroupId)
    }, [selectedGroupId])

    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (!selectedGroupId || doctorSearch.trim().length < 2) {
                setDoctorResults([])
                return
            }

            setSearchLoading(true)

            const memberDoctorIds = members.map(m => m.doctor_id)

            let query = supabase
                .from('doctors')
                .select('id, name, crm')
                .or(`name.ilike.%${doctorSearch.trim()}%,crm.ilike.%${doctorSearch.trim()}%`)
                .order('name', { ascending: true })
                .limit(10)

            if (memberDoctorIds.length > 0) {
                query = query.not('id', 'in', `(${memberDoctorIds.join(',')})`)
            }

            const { data, error } = await query

            if (error) {
                setError(error.message)
                setDoctorResults([])
                setSearchLoading(false)
                return
            }

            setDoctorResults(data || [])
            setSearchLoading(false)
        }, 300)

        return () => clearTimeout(timeout)
    }, [doctorSearch, selectedGroupId, members])

    const resetForm = () => {
        setName('')
        setCode('')
        setEditingId(null)
    }

    const handleCreate = async () => {
        if (!user) return

        const cleanName = name.trim()
        const cleanCode = code.trim().toUpperCase()

        if (!cleanName || !cleanCode) {
            setError('Informe o nome e o código do grupo.')
            return
        }

        setError('')

        const { error } = await supabase
            .from('doctor_groups')
            .insert({
                clinic_id: user.id,
                name: cleanName,
                code: cleanCode
            })

        if (error) {
            setError(error.message)
            return
        }

        resetForm()
        await loadGroups()
    }

    const handleUpdate = async () => {
        if (!editingId) return

        const cleanName = name.trim()
        const cleanCode = code.trim().toUpperCase()

        if (!cleanName || !cleanCode) {
            setError('Informe o nome e o código do grupo.')
            return
        }

        setError('')

        const { error } = await supabase
            .from('doctor_groups')
            .update({
                name: cleanName,
                code: cleanCode
            })
            .eq('id', editingId)

        if (error) {
            setError(error.message)
            return
        }

        resetForm()
        await loadGroups()
    }

    const handleDelete = async (groupId: string) => {
        const confirmed = window.confirm(
            'Excluir este grupo? Os médicos serão removidos do grupo, mas nenhum médico será excluído do sistema.'
        )

        if (!confirmed) return

        setError('')

        const { error } = await supabase
            .from('doctor_groups')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', groupId)

        if (error) {
            setError(error.message)
            return
        }

        if (selectedGroupId === groupId) {
            setSelectedGroupId(null)
            setMembers([])
        }

        await loadGroups()
    }

    const handleAddDoctor = async (doctor: Doctor) => {
        if (!selectedGroupId) return

        setError('')

        const { error } = await supabase
            .from('doctor_group_members')
            .insert({
                group_id: selectedGroupId,
                doctor_id: doctor.id
            })

        if (error) {
            setError(error.message)
            return
        }

        setDoctorSearch('')
        setDoctorResults([])
        await loadMembers(selectedGroupId)
        await loadGroups()
    }

    const handleRemoveDoctor = async (doctorId: string) => {
        if (!selectedGroupId) return

        setError('')

        const { error } = await supabase
            .from('doctor_group_members')
            .delete()
            .eq('group_id', selectedGroupId)
            .eq('doctor_id', doctorId)

        if (error) {
            setError(error.message)
            return
        }

        await loadMembers(selectedGroupId)
        await loadGroups()
    }

    if (loading) {
        return <div className='text-gray-500'>Carregando...</div>
    }

    return (
        <div className='flex flex-col gap-4'>
            <h1 className='text-2xl font-bold'>Grupos de médicos</h1>

            <div className='text-sm text-gray-600'>
                Crie grupos internos para organizar quais médicos poderão receber ou visualizar determinados plantões.
            </div>

            {error && (
                <div className='bg-red-100 text-red-700 p-3 rounded'>
                    {error}
                </div>
            )}

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
                <div className='lg:col-span-1 flex flex-col gap-4'>
                    <Card>
                        <div className='flex flex-col gap-3'>
                            <h2 className='text-lg font-semibold'>
                                {editingId ? 'Editar grupo' : 'Criar grupo'}
                            </h2>

                            <Input
                                value={name}
                                onChange={setName}
                                placeholder='Nome do grupo'
                            />

                            <Input
                                value={code}
                                onChange={(v) => setCode(v.toUpperCase())}
                                placeholder='Código do grupo'
                            />

                            <Button onClick={editingId ? handleUpdate : handleCreate}>
                                {editingId ? 'Salvar alterações' : 'Criar grupo'}
                            </Button>

                            {editingId && (
                                <Button onClick={resetForm}>
                                    Cancelar edição
                                </Button>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <div className='flex flex-col gap-3'>
                            <h2 className='text-lg font-semibold'>Grupos cadastrados</h2>

                            {groups.length === 0 && (
                                <div className='text-sm text-gray-500'>
                                    Nenhum grupo criado.
                                </div>
                            )}

                            {groups.map(group => (
                                <div
                                    key={group.id}
                                    className={`border rounded p-3 flex flex-col gap-2 ${selectedGroupId === group.id
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-200 bg-white'
                                        }`}
                                >
                                    <button
                                        onClick={() => setSelectedGroupId(group.id)}
                                        className='text-left'
                                    >
                                        <div className='font-semibold text-gray-900'>
                                            {group.name}
                                        </div>

                                        <div className='text-sm text-blue-600'>
                                            Código: {group.code}
                                        </div>

                                        <div className='text-xs text-gray-500'>
                                            {group.doctor_group_members?.length || 0} médico(s)
                                        </div>
                                    </button>

                                    <div className='flex gap-2 flex-wrap'>
                                        <Button
                                            onClick={() => {
                                                setEditingId(group.id)
                                                setName(group.name)
                                                setCode(group.code)
                                            }}
                                        >
                                            Editar
                                        </Button>

                                        <Button onClick={() => handleDelete(group.id)}>
                                            Excluir
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className='lg:col-span-2'>
                    <Card>
                        {!selectedGroup && (
                            <div className='text-gray-500'>
                                Selecione um grupo para gerenciar os médicos.
                            </div>
                        )}

                        {selectedGroup && (
                            <div className='flex flex-col gap-4'>
                                <div>
                                    <h2 className='text-lg font-semibold'>
                                        {selectedGroup.name}
                                    </h2>

                                    <div className='text-sm text-blue-600'>
                                        Código: {selectedGroup.code}
                                    </div>
                                </div>

                                <div className='border-t pt-4 flex flex-col gap-3'>
                                    <h3 className='font-semibold'>Adicionar médico</h3>

                                    <Input
                                        value={doctorSearch}
                                        onChange={setDoctorSearch}
                                        placeholder='Buscar médico por nome'
                                    />

                                    {searchLoading && (
                                        <div className='text-sm text-gray-500'>
                                            Buscando...
                                        </div>
                                    )}

                                    {!searchLoading &&
                                        doctorSearch.trim().length >= 2 &&
                                        doctorResults.length === 0 && (
                                            <div className='text-sm text-gray-500'>
                                                Nenhum médico encontrado.
                                            </div>
                                        )}

                                    {doctorResults.map(doctor => (
                                        <div
                                            key={doctor.id}
                                            className='border rounded p-3 flex justify-between items-center gap-3'
                                        >
                                            <div>
                                                <div className='font-medium'>
                                                    {doctor.name || '-'}
                                                </div>

                                                <div className='text-sm text-gray-500'>
                                                    CRM: {doctor.crm || '-'}
                                                </div>
                                            </div>

                                            <Button onClick={() => handleAddDoctor(doctor)}>
                                                Adicionar
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                <div className='border-t pt-4 flex flex-col gap-3'>
                                    <h3 className='font-semibold'>
                                        Médicos no grupo
                                    </h3>

                                    {membersLoading && (
                                        <div className='text-sm text-gray-500'>
                                            Carregando médicos...
                                        </div>
                                    )}

                                    {!membersLoading && members.length === 0 && (
                                        <div className='text-sm text-gray-500'>
                                            Nenhum médico neste grupo.
                                        </div>
                                    )}

                                    {!membersLoading && members.map(member => (
                                        <div
                                            key={member.id}
                                            className='border rounded p-3 flex justify-between items-center gap-3'
                                        >
                                            <div>
                                                <div className='font-medium'>
                                                    {member.doctors?.name || '-'}
                                                </div>

                                                <div className='text-sm text-gray-500'>
                                                    CRM: {member.doctors?.crm || '-'}
                                                </div>
                                            </div>

                                            <Button
                                                onClick={() => handleRemoveDoctor(member.doctor_id)}
                                            >
                                                Remover
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    )
}