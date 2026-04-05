//components/ui/Input.tsx
type Props = {
    value: string
    onChange: (v: string) => void
    placeholder?: string
    type?: string
    className?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'className' | 'placeholder'>

export default function Input({
    value,
    onChange,
    placeholder,
    type = 'text',
    className = '',
    ...props
}: Props) {
    return (
        <input
            type={type}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 outline-none px-3 py-2 rounded w-full transition ${className}`}
            {...props}
        />
    )
}