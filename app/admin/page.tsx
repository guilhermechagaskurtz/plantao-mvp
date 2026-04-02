'use client'
import Card from '@/components/ui/Card'

export default function AdminPage() {
  return (
    <div className='flex flex-col gap-6'>

      <h1 className='text-2xl font-bold'>Admin</h1>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>

        <a href='/admin/clinics'>
          <Card className='p-6 hover:shadow-md transition cursor-pointer'>
            <h2 className='text-lg font-semibold text-gray-900'>Clínicas</h2>
            <p className='text-sm text-gray-500'>
              Gerenciar clínicas cadastradas
            </p>
          </Card>
        </a>

        <a href='/admin/doctors'>
          <Card className='p-6 hover:shadow-md transition cursor-pointer'>
            <h2 className='text-lg font-semibold text-gray-900'>Médicos</h2>
            <p className='text-sm text-gray-500'>
              Aprovar e gerenciar médicos
            </p>
          </Card>
        </a>

      </div>
    </div>
  )
}