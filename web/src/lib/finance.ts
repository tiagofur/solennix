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

export const formatCurrency = (amount: number | string, currency: string = activeCurrency): string => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return "$0.00";
  }

  // To display the currency code when it is not MXN (consistent with Apple/Google native practices)
  const currencyCode = currency || "MXN";
  const formatted = numAmount.toLocaleString("es-MX", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatted;
};

