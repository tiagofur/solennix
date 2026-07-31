import React from "react";
import {
  FileText,
  DollarSign,
  ShoppingCart,
  FileCheck,
  Camera,
  ClipboardList,
} from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

type ViewMode = "summary" | "ingredients" | "contract" | "payments" | "photos" | "checklist";

export interface EventTabBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  photosCount: number;
  checklistItemsCount: number;
  checklistProgress: number;
  isDownpaymentMet: boolean;
}

/**
 * The horizontal segmented control that switches EventSummary views.
 * Pure presentational: driven by a tab-config array. Badge counts and
 * the downpayment-dimmed contract tab come in as props.
 */
export const EventTabBar: React.FC<EventTabBarProps> = ({
  viewMode,
  onViewModeChange,
  photosCount,
  checklistItemsCount,
  checklistProgress,
  isDownpaymentMet,
}) => {
  const { t } = useTranslation(['events', 'common']);

  type IconType = typeof FileText;

  const tabs: {
    mode: ViewMode;
    icon: IconType;
    label: string;
    badge?: React.ReactNode;
    dimmed?: boolean;
    iconClass?: string;
  }[] = [
    { mode: "summary", icon: FileText, label: t('events:summary.tabs.summary') },
    { mode: "payments", icon: DollarSign, label: t('events:summary.tabs.payments') },
    { mode: "ingredients", icon: ShoppingCart, label: t('events:summary.tabs.shopping') },
    {
      mode: "contract",
      icon: FileCheck,
      label: t('events:summary.tabs.contract'),
      dimmed: !isDownpaymentMet,
      iconClass: !isDownpaymentMet ? "text-warning" : undefined,
    },
    {
      mode: "photos",
      icon: Camera,
      label: t('events:summary.tabs.photos'),
      badge: photosCount > 0 && (
        <span className="ml-1.5 bg-primary/10 text-primary text-xs font-bold rounded-full px-1.5 py-0.5">
          {photosCount}
        </span>
      ),
    },
    {
      mode: "checklist",
      icon: ClipboardList,
      label: t('events:summary.tabs.checklist'),
      badge: checklistItemsCount > 0 && (
        <span className="ml-1.5 bg-primary/10 text-primary text-xs font-bold rounded-full px-1.5 py-0.5">
          {Math.round(checklistProgress * 100)}%
        </span>
      ),
    },
  ];

  return (
    <div className="print:hidden flex justify-center">
      <div className="inline-flex bg-surface-alt dark:bg-surface-alt/50 rounded-2xl p-1.5 overflow-x-auto no-scrollbar shadow-sm" role="group" aria-label={t('events:summary.view_modes_aria')}>
        {tabs.map(({ mode, icon: Icon, label, badge, dimmed, iconClass }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onViewModeChange(mode)}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all whitespace-nowrap",
              viewMode === mode
                ? "bg-card text-primary shadow-sm"
                : "text-text-secondary hover:text-text hover:bg-surface-alt",
              dimmed && "opacity-50 grayscale-[0.5]",
            )}
            aria-pressed={viewMode === mode}
            aria-label={label}
          >
            <Icon className={clsx("h-4 w-4 sm:mr-2", iconClass)} aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
            {badge}
          </button>
        ))}
      </div>
    </div>
  );
};
