import React from 'react'
import { cn } from '@/lib/utils'
import { Inbox, type LucideIcon } from 'lucide-react'

type EmptyProps = {
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
  icon?: LucideIcon
  showImage?: boolean
}

export default function Empty({
  title = 'Sin resultados',
  description = 'No hay información para mostrar en este momento.',
  action,
  className,
  icon: Icon = Inbox,
  showImage = true,
}: EmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-20 text-center animate-fade-in', className)} role="status">
      {showImage && (
        <div className="relative mb-8 group" aria-hidden="true">
          {/* Outer glow */}
          <div className="absolute inset-0 bg-brand-orange/10 blur-3xl rounded-full scale-150 group-hover:bg-brand-orange/15 transition-all duration-500" />

          {/* Decorative rings */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-full border-2 border-dashed border-brand-orange/15 animate-[spin_25s_linear_infinite]" />
            <div className="absolute -inset-8 rounded-full border border-brand-orange/8 animate-[spin_35s_linear_infinite_reverse]" />

            {/* Main icon container */}
            <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-orange/15 to-brand-orange/5 dark:from-brand-orange/20 dark:to-brand-orange/8 flex items-center justify-center shadow-lg shadow-brand-orange/10 group-hover:scale-105 transition-transform duration-500 ring-1 ring-brand-orange/20">
              <Icon className="w-10 h-10 text-brand-orange" strokeWidth={1.5} />
            </div>

            {/* Decorative dots */}
            <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-brand-orange/30 animate-pulse" />
            <div className="absolute -bottom-1 -left-3 w-2 h-2 rounded-full bg-brand-orange/20 animate-pulse [animation-delay:1s]" />
          </div>
        </div>
      )}

      <div className="max-w-md relative z-10">
        <h3 className="text-xl font-semibold text-text mb-2">
          {title}
        </h3>
        <p className="text-text-secondary text-sm mb-8 leading-relaxed">
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
