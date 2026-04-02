type Props = {
    title: string
    children: React.ReactNode
    action?: React.ReactNode
}

export default function Section({ title, children, action }: Props) {
    return (
        <div className='flex flex-col gap-3'>
            <div className='flex justify-between items-center'>
                <h2 className='text-lg font-semibold text-gray-900'>{title}</h2>
                {action}
            </div>

            {children}
        </div>
    )
}