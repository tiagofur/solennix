import React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

type SplitPaneProps = {
  /** Left column: the persistent, filterable list. */
  master: React.ReactNode
  /** Right column: the detail panel or empty-selection state. Hidden below xl. */
  detail: React.ReactNode
  masterClassName?: string
  detailClassName?: string
  className?: string
}

/**
 * Master-detail split container for desktop (#879).
 *
 * At xl+ (1280px) renders a two-column grid (list | detail) with independent
 * vertical scroll on each pane. Below xl the detail pane is hidden and the
 * master fills the width — consumers handle navigation instead.
 *
 * The grid mirrors the `lg:grid-cols-[Npx_1fr]` idiom from TeamCalendarPage
 * but splits at xl and keeps the list as the fluid column so detail gets a
 * predictable 380–520px rail.
 */
export function SplitPane({
  master,
  detail,
  masterClassName,
  detailClassName,
  className,
}: SplitPaneProps) {
  const { t } = useTranslation('common')
  return (
    <div
      className={cn(
        'grid grid-cols-1 xl:h-full xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] xl:gap-6',
        className,
      )}
    >
      <div className={cn('min-w-0', masterClassName)}>{master}</div>
      {/* Detail pane: hidden below xl; the list route owns full-page nav there. */}
      <div
        className={cn(
          'hidden xl:block xl:min-h-0 xl:overflow-y-auto',
          detailClassName,
        )}
        aria-label={t('a11y.detail_panel')}
      >
        {detail}
      </div>
    </div>
  )
}
