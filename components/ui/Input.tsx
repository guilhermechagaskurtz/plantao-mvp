type Props = {
    value: string
    onChange: (v: string) => void
    placeholder?: string
    type?: string
    className?: string
}

export default function Input({
    value,
    onChange,
    placeholder,
    type = 'text',
    className = ''
}: Props) {
    return (
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none px-3 py-2 rounded w-full ${className}`}
        />
    )
}