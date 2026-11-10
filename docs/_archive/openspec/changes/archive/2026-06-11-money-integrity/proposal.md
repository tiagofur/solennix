# Proposal: Money Integrity (Issue #515)

Fix four money-correctness and financial UI integrity issues in the web frontend to ensure matching numbers, clamped discounts, positive payment registrations, and exact PDF calculations.

## Proposed Changes

### 1. Event Summary Margin Calculation
Subtract pass-through revenue (utility-excluded extras) from the margin denominator to align with `EventFinancials` and `QuickQuotePage`.
- Calculate `passThroughRevenue = extras.filter(e => e.exclude_utility).reduce((sum, e) => sum + e.price, 0)`
- Adjust `margin` formula to: `adjustedRevenue = revenueExTax - passThroughRevenue; margin = adjustedRevenue > 0 ? (profit / adjustedRevenue) * 100 : 0`

### 2. Clamped Percent Discount in Quick Quote
Ensure percent discounts cannot exceed 100% or go below 0% in state.
- Clamp `discountValue` between 0 and 100 in `onChange` if `discountType === "percent"`.
- Force clamp `discountValue` when clicking the `%` toggle.

### 3. Positive Payments Validation
Require manual payment registrations to be positive (> 0) with a visible localized validation message.
- Update RHF register for `amount` to include a validation message for the `min` rule: `{ value: 0.01, message: t('payment.amount_min_error') }`.
- Add `"amount_min_error"` translation keys to English and Spanish common locale JSONs.

### 4. Rounded PDF Financials
Prevent centavo drift in PDF generators by rounding line totals and sums to 2 decimal places.
- Round budget product row totals: `Math.round(((p.unit_price - (p.discount || 0)) * p.quantity) * 100) / 100`.
- Round `subtotalForDiscount`, `discountAmount`, and `preDiscountSubtotal` in `generateBudgetPDF`.
- Round `totalPaid` and `balance` in `generatePaymentReportPDF`.
