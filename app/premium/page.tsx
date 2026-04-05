'use client'

import { useRouter } from 'next/navigation'

export default function PremiumPage() {
    const router = useRouter()

    return (
        <div className='max-w-4xl mx-auto px-6 py-10 flex flex-col gap-10'>

            {/* HERO */}
            <div className='text-center flex flex-col gap-4'>
                <h1 className='text-3xl font-bold text-gray-900'>
                    SOS DOCTOR Premium
                </h1>

                <p className='text-gray-600 text-lg'>
                    Pegue os melhores plantões antes de todo mundo.
                </p>
            </div>

            {/* BENEFÍCIOS */}
            <div className='grid md:grid-cols-2 gap-6'>

                <div className='p-5 border rounded-lg bg-white'>
                    <h2 className='font-semibold text-lg mb-2'>⚡ Notificações antecipadas</h2>
                    <p className='text-sm text-gray-600'>
                        Receba novos plantões antes dos outros médicos e aumente suas chances de aceitar os melhores.
                    </p>
                </div>

                <div className='p-5 border rounded-lg bg-white'>
                    <h2 className='font-semibold text-lg mb-2'>🎯 Filtros avançados</h2>
                    <p className='text-sm text-gray-600'>
                        Encontre exatamente os plantões que fazem sentido para você, combinando valor, distância e especialidade.
                    </p>
                </div>

                <div className='p-5 border rounded-lg bg-white'>
                    <h2 className='font-semibold text-lg mb-2'>🚀 Lista otimizada</h2>
                    <p className='text-sm text-gray-600'>
                        Veja primeiro os plantões mais vantajosos com uma ordenação inteligente.
                    </p>
                </div>

                <div className='p-5 border rounded-lg bg-white'>
                    <h2 className='font-semibold text-lg mb-2'>🔔 Alertas em tempo real</h2>
                    <p className='text-sm text-gray-600'>
                        Receba avisos imediatos sem precisar atualizar a página.
                    </p>
                </div>

                <div className='p-5 border rounded-lg bg-white'>
                    <h2 className='font-semibold text-lg mb-2'>⭐ Favoritos e bloqueios</h2>
                    <p className='text-sm text-gray-600'>
                        Priorize clínicas que você gosta e ignore as que não fazem sentido para você.
                    </p>
                </div>

                <div className='p-5 border rounded-lg bg-white'>
                    <h2 className='font-semibold text-lg mb-2'>📊 Histórico inteligente</h2>
                    <p className='text-sm text-gray-600'>
                        Visualize seus ganhos e identifique padrões para maximizar sua renda.
                    </p>
                </div>

            </div>

            {/* DESTAQUE */}
            <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center'>
                <h2 className='text-xl font-semibold mb-2'>
                    Mais controle. Mais velocidade. Mais plantões.
                </h2>
                <p className='text-gray-700'>
                    O SOS DOCTOR Premium foi feito para médicos que querem ganhar mais e perder menos oportunidades.
                </p>
            </div>

            {/* CTA */}
            <div className='text-center flex flex-col gap-4'>
                <button
                    onClick={() => router.push('/doctor/profile')}
                    className='bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 px-6 rounded-lg transition'
                >
                    Ativar Premium
                </button>

                <p className='text-xs text-gray-500'>
                    (Durante o beta, o acesso é liberado para testes)
                </p>
            </div>

        </div>
    )
}