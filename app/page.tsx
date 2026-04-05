/*
app/page.tsx
*/
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login')
  }, [router])

  return (
    <div className='h-screen flex items-center justify-center text-sm text-gray-500'>
      Redirecionando...
    </div>
  )
}