'use client'

export default function AdminPage() {
  return (
    <div className='flex flex-col gap-6'>

      <h1 className='text-2xl font-bold'>Admin</h1>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>

        <a
          href='/admin/clinics'
          className='p-6 bg-white rounded-lg shadow hover:shadow-md border'
        >
          <h2 className='text-lg font-semibold'>Clínicas</h2>
          <p className='text-sm text-gray-500'>
            Gerenciar clínicas cadastradas
          </p>
        </a>

        <a
          href='/admin/doctors'
          className='p-6 bg-white rounded-lg shadow hover:shadow-md border'
        >
          <h2 className='text-lg font-semibold'>Médicos</h2>
          <p className='text-sm text-gray-500'>
            Aprovar e gerenciar médicos
          </p>
        </a>

      </div>
    </div>
  )
}