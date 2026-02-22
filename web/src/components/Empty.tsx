import React from 'react'
import { cn } from '@/lib/utils'

type EmptyProps = {
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
  showImage?: boolean
}

export default function Empty({
  title = 'Sin resultados',
  description = 'No hay información para mostrar en este momento.',
  action,
  className,
  showImage = true,
}: EmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-20 text-center animate-fade-in', className)}>
      {showImage && (
        <div className="relative mb-8 group">
          <div className="absolute inset-0 bg-brand-orange/20 blur-3xl rounded-full scale-150 opacity-10 group-hover:opacity-20 transition-opacity" />
          <img 
            src="/assets/empty-state.png" 
            alt="Vío" 
            className="w-48 h-48 object-contain drop-shadow-2xl relative z-10 hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      
      <div className="max-w-md relative z-10">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {title}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-base mb-8 leading-relaxed">
          {description}
        </p>
        
        {action && (
          <div className="flex justify-center transition-all duration-300 hover:translate-y-[-2px]">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}
