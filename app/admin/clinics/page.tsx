//admin/clinics/page.tsx
import { Suspense } from 'react'
import ClinicsContent from './ClinicsContent'

export default function Page() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <ClinicsContent />
        </Suspense>
    )
}