/*
components/ui/Cards.tsx
*/
type Props = {
    children?: React.ReactNode
    className?: string
    onClick?: () => void
}

export default function Card({ children, className = '', onClick }: Props) {
    return (
        <div
            onClick={onClick}
            className={`bg-white border border-gray-200 rounded-lg shadow-sm p-4 ${className}`}
        >
            {children}
        </div>
    )
}