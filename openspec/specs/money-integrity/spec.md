# Money Integrity Specification

## Purpose
Define requirements for financial calculations, discount limits, payment validations, and PDF reporting to ensure correctness of money figures in the web app.

## Requirements

### Requirement: Event Margin pass-through exclusions
The event financial margin calculation MUST subtract pass-through revenue (utility-excluded extras) from the denominator.

#### Scenario: Compare Margin KPIs
- GIVEN an event with total revenue MXN 50,000 (MXN 45,000 service, MXN 5,000 pass-through venue extra)
- AND event total cost is MXN 20,000
- WHEN viewing the Event Summary page or Event Financials
- THEN both views MUST show a margin of approximately 55.6% (i.e. `(45,000 - 20,000) / 45,000 * 100`)

---

### Requirement: Clamped Percent Discount
Percent discount values in Quick Quote MUST be strictly clamped to the range `[0, 100]`.

#### Scenario: State Level Clamping
- GIVEN the user is configuring a Quick Quote
- WHEN the user sets the discount type to percent
- AND enters a value greater than 100 (e.g. 150) or less than 0 (e.g. -10)
- THEN the discount value state MUST be clamped to 100 or 0 respectively, preventing negative quote totals

---

### Requirement: Positive Payment Amount Validation
Manual payment registrations MUST enforce positive amounts (> 0) with a visible error message.

#### Scenario: Zero-amount Payment Registration
- GIVEN the organizer is registering a payment manually for an event
- WHEN the organizer enters `0.00` or a negative value as the amount
- THEN the form MUST prevent submission
- AND display a localized validation error message stating that the amount must be greater than 0

---

### Requirement: Exact Rounded PDF Arithmetic
The PDF generators MUST round intermediate line totals and final summary values to 2 decimal places to prevent centavo float drift.

#### Scenario: Float Summation Rounding
- GIVEN an event with multiple products and payments containing float amounts
- WHEN the organizer exports the Budget PDF or Payment Report PDF
- THEN all line item totals, discount values, tax values, subtotals, total paid, and balances MUST be rounded to 2 decimal places before rendering
