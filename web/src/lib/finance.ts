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

export const formatCurrency = (amount: number | string, currency: string = "MXN"): string => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return "$0.00";
  }

  return numAmount.toLocaleString("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

