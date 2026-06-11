# Tasks: Money Integrity

- [x] 1. Event Summary Margin Calculation
  - [x] 1.1 Calculate pass-through revenue in `EventSummary.tsx`
  - [x] 1.2 Subtract it from the margin denominator in `EventSummary.tsx`
- [x] 2. Clamped Percent Discount in Quick Quote
  - [x] 2.1 Clamp `discountValue` between 0 and 100 in `onChange` in `QuickQuotePage.tsx`
  - [x] 2.2 Clamp `discountValue` on discountType `%` toggle in `QuickQuotePage.tsx`
- [x] 3. Positive Payments Validation
  - [x] 3.1 Update validation register in `PaymentFormFields.tsx` to include `min` error message
  - [x] 3.2 Add translation key in `es/common.json`
  - [x] 3.3 Add translation key in `en/common.json`
  - [x] 3.4 Update tests in `PaymentFormFields.test.tsx` to assert the validation error message
- [x] 4. Rounded PDF Financials
  - [x] 4.1 Round line items calculation in `pdfGenerator.ts`
  - [x] 4.2 Round summary totals in `pdfGenerator.ts`
- [x] 5. Verification and Cleanup
  - [x] 5.1 Run all Vitest unit tests in `web/`
  - [x] 5.2 Execute global verification suite `./init.sh`
