import React, { useEffect, useState } from "react";
import {
  MoreVertical,
  Download,
  ShoppingCart,
  FileCheck,
  ClipboardList,
} from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/useToast";
import { downloadEventPDF } from "@/services/pdfService";
import { logError } from "@/lib/errorHandler";

type ViewMode = "summary" | "ingredients" | "contract" | "payments" | "photos" | "checklist";

export interface EventActionsMenuProps {
  eventId: string | undefined;
  isDownpaymentMet: boolean;
  viewMode: ViewMode;
  paymentsCount: number;
}

/**
 * "More actions" dropdown that groups the PDF export entries
 * (budget / shopping list / checklist / contract / payment report).
 * Self-contained: owns its open/close state + the outside-click effect.
 */
export const EventActionsMenu: React.FC<EventActionsMenuProps> = ({
  eventId,
  isDownpaymentMet,
  viewMode,
  paymentsCount,
}) => {
  const { t } = useTranslation(['events', 'common']);
  const { addToast } = useToast();
  const [actionsDropdownOpen, setActionsDropdownOpen] = useState(false);

  // Close the dropdown when clicking outside it.
  useEffect(() => {
    const handleClickOutside = () => {
      setActionsDropdownOpen(false);
    };
    if (actionsDropdownOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [actionsDropdownOpen]);

  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setActionsDropdownOpen(!actionsDropdownOpen)}
        className="h-10 w-10 sm:h-9 sm:w-9 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-surface-alt transition-colors text-text-secondary hover:text-text"
        aria-label={t('common:actions.more')}
        aria-expanded={actionsDropdownOpen}
        aria-haspopup="menu"
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      {actionsDropdownOpen && (
        <div className="absolute right-0 mt-1 w-56 sm:w-72 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden py-1" role="menu">
          <p className="px-4 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider border-b border-border mb-1">
            {t('events:summary.actions.export_pdf')}
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await downloadEventPDF(eventId, 'budget');
              } catch (err) {
                logError("Error generating budget PDF", err);
                addToast(t('events:summary.error_pdf'), "error");
              }
              setActionsDropdownOpen(false);
            }}
            className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
            role="menuitem"
          >
            <Download className="h-5 w-5 mr-3 text-text-secondary" />
            {t('events:summary.actions.budget')}
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await downloadEventPDF(eventId, 'shopping-list');
              } catch (err) {
                logError("Error generating shopping list PDF", err);
                addToast(t('events:summary.error_pdf'), "error");
              }
              setActionsDropdownOpen(false);
            }}
            className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
            role="menuitem"
          >
            <ShoppingCart className="h-5 w-5 mr-3 text-text-secondary" />
            {t('events:summary.actions.shopping_list')}
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await downloadEventPDF(eventId, 'checklist');
              } catch (err) {
                logError("Error generating checklist PDF", err);
                addToast(t('events:summary.error_checklist'), "error");
              }
              setActionsDropdownOpen(false);
            }}
            className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
            role="menuitem"
          >
            <ClipboardList className="h-5 w-5 mr-3 text-text-secondary" />
            {t('events:summary.actions.checklist')}
          </button>
          <button
            type="button"
            disabled={!isDownpaymentMet}
            onClick={async () => {
              try {
                await downloadEventPDF(eventId, 'contract');
              } catch (err) {
                logError("Error generating contract PDF", err);
                addToast(t('events:summary.error_pdf'), "error");
              }
              setActionsDropdownOpen(false);
            }}
            className={clsx(
              "w-full flex items-center px-4 py-2.5 text-sm transition-colors",
              !isDownpaymentMet
                ? "text-text-tertiary cursor-not-allowed bg-surface-alt/50"
                : "text-text hover:bg-surface-alt dark:hover:bg-surface"
            )}
            role="menuitem"
          >
            <FileCheck className={clsx("h-5 w-5 mr-3", !isDownpaymentMet ? "text-warning/50" : "text-text-secondary")} />
            {t('events:summary.actions.contract')} {!isDownpaymentMet && `(${t('events:summary.actions.settle_downpayment')})`}
          </button>
          {viewMode === "payments" && paymentsCount > 0 && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await downloadEventPDF(eventId, 'payment-report');
                } catch (err) {
                  logError("Error generating payment report PDF", err);
                  addToast(t('events:summary.error_pdf'), "error");
                }
                setActionsDropdownOpen(false);
              }}
              className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
              role="menuitem"
            >
              <Download className="h-5 w-5 mr-3 text-text-secondary" />
              {t('events:summary.actions.payment_report')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
