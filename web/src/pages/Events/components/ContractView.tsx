import React from "react";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { renderFormattedReact } from "@/lib/inlineFormatting";
import type { Event, User } from "@/types/entities";

// Matches UserProfile in pdfGenerator (User + optional template fields)
export type UserProfile = User & {
  contract_template?: string | null;
};

export interface ContractViewProps {
  contractPreview: string;
  contractPreviewMissingTokens: string[];
  isDownpaymentMet: boolean;
  depositAmount: number;
  totalPaid: number;
  moneyLocale: string;
  eventCurrency: string;
  event: Event;
  profile: UserProfile | null;
  /** Called with (depositAmount - totalPaid) when the user clicks "register deposit now". */
  onRegisterDeposit: (amount: number) => void;
}

/**
 * `viewMode === "contract"` block: a serif "contract" page rendered from
 * the resolved template. Three branches: missing-template-tokens warning,
 * deposit-required prompt (calls onRegisterDeposit), and the rendered
 * contract paragraphs.
 *
 * Template rendering + deposit math stay in the parent; this component is
 * purely presentational on top of the derived strings/values.
 */
export const ContractView: React.FC<ContractViewProps> = ({
  contractPreview,
  contractPreviewMissingTokens,
  isDownpaymentMet,
  depositAmount,
  totalPaid,
  moneyLocale,
  eventCurrency,
  event,
  profile,
  onRegisterDeposit,
}) => {
  const { t } = useTranslation(['events', 'common']);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-card shadow-xl rounded-[40px] p-12 sm:p-20 border border-border font-serif text-text leading-relaxed max-w-4xl mx-auto relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
        <div className="text-center mb-16">
          <h1 className="text-3xl font-black uppercase tracking-[0.2em] text-text">
            {t('events:summary.contract_title')}
          </h1>
          <div className="w-24 h-1 bg-primary mx-auto mt-4"></div>
        </div>

        {contractPreviewMissingTokens.length > 0 ? (
          <div className="space-y-4 text-center">
            <p className="text-error font-semibold">
              {t('events:summary.contract_missing_data')}
            </p>
            <p className="text-sm text-text-secondary">
              {t('events:summary.contract_complete_fields')}: {contractPreviewMissingTokens.map((token) => `[${token}]`).join(", ")}
            </p>
          </div>
        ) : !isDownpaymentMet ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="bg-warning/10 p-6 rounded-full">
              <AlertCircle className="h-12 w-12 text-warning" />
            </div>
            <h3 className="text-2xl font-black text-text uppercase">{t('events:summary.deposit_required')}</h3>
            <p className="text-text-secondary max-w-md">
              {t('events:summary.deposit_required_desc', { percent: event.deposit_percent })}
              ({depositAmount.toLocaleString(moneyLocale, { style: 'currency', currency: eventCurrency })}).
            </p>
            <p className="text-sm text-warning font-bold">
              {t('events:summary.deposit_missing', { amount: (depositAmount - totalPaid).toLocaleString(moneyLocale, { style: 'currency', currency: eventCurrency }) })}
            </p>
            <button
              type="button"
              onClick={() => onRegisterDeposit(depositAmount - totalPaid)}
              className="mt-4 px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95"
            >
              {t('events:summary.actions.register_deposit_now')}
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-justify whitespace-pre-line">
            {contractPreview.split(/\n\n+/).map((paragraph, index) => (
              <p key={index}>{renderFormattedReact(paragraph)}</p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-16 mt-24 pt-12">
          <div className="text-center border-t border-border pt-4">
            <p className="font-bold">
              {profile?.business_name || profile?.name || t('events:summary.the_provider')}
            </p>
            <p className="text-sm text-text-secondary mt-1">
              {t('events:summary.signature')}
            </p>
          </div>
          <div className="text-center border-t border-border pt-4">
            <p className="font-bold">{event.client?.name}</p>
            <p className="text-sm text-text-secondary mt-1">
              {t('events:summary.signature_client')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
