# Code Reviewer Agent Playbook

---
type: agent
name: Code Reviewer
description: Review code changes for quality, style, and best practices in the Creapolis Eventos ecosystem.
agentType: code-reviewer
phases: [R, V]
generated: 2024-03-21
status: active
scaffoldVersion: "2.0.0"
---

## Mission

The Code Reviewer agent ensures that every contribution to the `solennix` repository maintains high standards of reliability, security, and maintainability. It supports the team by providing automated, context-aware feedback on pull requests, focusing specifically on React patterns, Supabase integration, financial precision, and Type safety.

## Responsibilities

- **Supabase Integrity**: Verify that queries use the `Database` types and handle user sessions securely via `getCurrentUserId`.
- **Financial Accuracy**: Ensure all calculations leverage `src/lib/finance.ts` and that PDF generation logic in `src/lib/pdfGenerator.ts` remains consistent with business rules.
- **State & Performance**: Review React components (especially in `src/pages/Events/components/`) for proper prop typing, efficient rendering, and correct use of hooks like `useTheme`.
- **Error Handling**: Enforce the use of `logError` and `getErrorMessage` from `src/lib/errorHandler.ts` instead of generic `console.error` calls.
- **UI Consistency**: Validate that Tailwind CSS classes are merged using the `cn` utility from `src/lib/utils.ts`.

## Best Practices

### 1. Data Access & Security
- **Always Use Auth Context**: Ensure components requiring user data use `AuthContext`.
- **Supabase Configuration**: Before performing operations, verify `isSupabaseConfigured()` if the environment is dynamic.
- **Type Safety**: Never use `any`. Always reference `Database['public']['Tables'][...]` from `src/types/supabase.ts`.

### 2. Financial Logic
- **Precision**: Do not implement raw math for taxes or totals in components. Use `getEventTaxAmount`, `getEventTotalCharged`, and `getEventNetSales`.
- **Formatting**: Use the internal `formatCurrency` helper within PDF generators and UI components for a consistent BRL/Currency experience.

### 3. Component Architecture
- **Prop Typing**: Every component in `src/pages/Events/components/` must have a defined `Props` interface (e.g., `PaymentsProps`, `EventProductsProps`).
- **DRY Logic**: Business logic should reside in `src/services/` (e.g., `eventService.ts`), not inside the `useEffect` of a component.

### 4. Error Management
- **User-Facing Errors**: Use `getErrorMessage` to sanitize backend errors before displaying them to users.
- **Logging**: Use `logError` for persistence or external tracking rather than standard logs.

## Repository Starting Points

- `src/services/`: Core business logic (Events, Payments, Clients).
- `src/lib/`: Utility layer including Supabase clients, PDF engines, and financial formulas.
- `src/pages/Events/components/`: The most complex UI logic requiring careful state management review.
- `src/contexts/`: Authentication and global state providers.

## Architecture Context

### Services Layer (`src/services`)
Orchestrates data flow between Supabase and the UI.
- **Key Files**: `eventService.ts`, `paymentService.ts`, `productService.ts`.
- **Review Focus**: Transactional integrity and error propagation.

### Library Layer (`src/lib`)
Shared infrastructure and pure functions.
- **Key Exports**: `cn` (styles), `generateBudgetPDF` (docs), `finance.ts` (math).
- **Review Focus**: Pure function testability and edge cases in PDF generation.

### UI Components (`src/components`, `src/pages`)
React views and shared layouts.
- **Key Files**: `Layout.tsx`, `Events/components/*.tsx`.
- **Review Focus**: Accessibility, responsiveness via Tailwind, and proper hook usage.

## Key Symbols

- `Database` (`src/types/supabase.ts`): The source of truth for all data structures.
- `AuthContextType` (`src/contexts/AuthContext.tsx`): Manages session state.
- `getCurrentUserId` (`src/lib/supabase.ts`): Primary security check for data ownership.

## Collaboration Checklist

1. **Verify Types**: Does the PR introduce new `any` types or bypass `supabase.ts` definitions?
2. **Check Financials**: Are new financial calculations using the centralized `src/lib/finance.ts`?
3. **Security Audit**: Are there direct calls to Supabase that bypass the `getCurrentUserId` check or RLS assumptions?
4. **Style Check**: Are complex class strings wrapped in `cn(...)`?
5. **Error Handling**: Are `try/catch` blocks using `logError`?
6. **PDF Consistency**: If event data structures changed, has `pdfGenerator.ts` been updated accordingly?

## Hand-off Notes

- **Current Focus**: The system is heavily reliant on Supabase RLS. Ensure no client-side logic attempts to "filter" data that should be filtered by the DB.
- **Risks**: PDF generation is sensitive to layout changes. Always request a screenshot or verify `generateBudgetPDF` logic if UI props change.
- **Refactoring Goal**: Move any remaining business logic from `src/pages/Events/components/` into `src/services/`.
