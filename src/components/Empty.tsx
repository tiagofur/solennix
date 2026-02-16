import React from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

type EmptyProps = {
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export default function Empty({
  title = 'Sin resultados',
  description = 'No hay información para mostrar.',
  action,
  className,
}: EmptyProps) {
  return (
    <div className={cn('flex h-full items-center justify-center px-4 py-12', className)}>
      <div className="max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <Inbox className="w-6 h-6 text-gray-500 dark:text-gray-300" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p>
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </div>
    </div>
  )
}
