type Props = {
    children: React.ReactNode
}

export function Table({ children }: Props) {
    return (
        <div className='border rounded-lg bg-white shadow-sm overflow-hidden'>
            <table className='w-full text-sm'>{children}</table>
        </div>
    )
}

export function THead({ children }: Props) {
    return (
        <thead className='bg-gray-50 border-b'>
            {children}
        </thead>
    )
}

export function TH({ children }: Props) {
    return (
        <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase'>
            {children}
        </th>
    )
}

export function TR({ children }: Props) {
    return (
        <tr className='border-b hover:bg-gray-50 transition'>
            {children}
        </tr>
    )
}

export function TD({ children }: Props) {
    return (
        <td className='px-4 py-3'>
            {children}
        </td>
    )
}