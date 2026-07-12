import { Event } from '../types/entities'

type EventRow = Event

export const getEventTaxAmount = (event: Pick<EventRow, 'requires_invoice' | 'tax_amount'>) => {
  if (!event.requires_invoice) return 0
  return Number(event.tax_amount || 0)
}

export const getEventTotalCharged = (event: Pick<EventRow, 'total_amount'>) => {
  return Number(event.total_amount || 0)
}

export const getEventNetSales = (
  event: Pick<EventRow, 'requires_invoice' | 'total_amount' | 'tax_amount'>,
) => {
  const total = getEventTotalCharged(event)
  const tax = getEventTaxAmount(event)
  return Math.max(0, total - tax)
}

let activeCurrency = "MXN";

export const setDefaultCurrency = (currency: string) => {
  if (currency) {
    activeCurrency = currency;
  }
};

// Locale used for currency/date formatting; aligned with i18n.language.
let activeLocale = "es-MX";

// Maps an i18n language code to an Intl-compatible locale. Only es/en are
// supported today — extend here when new languages land.
export const localeFromLanguage = (language: string): string => {
  return language?.startsWith("en") ? "en-US" : "es-MX";
};

export const setDefaultLocale = (locale: string) => {
  if (locale) {
    activeLocale = locale;
  }
};

export const formatCurrency = (amount: number | string, currency: string = activeCurrency): string => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return "$0.00";
  }

  // To display the currency code when it is not MXN (consistent with Apple/Google native practices)
  const currencyCode = currency || "MXN";
  const formatted = numAmount.toLocaleString(activeLocale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatted;
};

// Shared tolerance for treating a balance as fully paid. Float arithmetic
// can leave sub-cent residue; treat anything within this epsilon as zero.
export const PAYMENT_COMPLETION_EPSILON = 0.01;

// Round an amount to 2 decimal places (cents). Use before persisting money
// values to avoid float drift (e.g. 0.1 + 0.2 = 0.30000000000000004).
export const roundToCents = (amount: number): number => {
  return Math.round((Number(amount) || 0) * 100) / 100;
};

