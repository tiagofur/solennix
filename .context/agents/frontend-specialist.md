## Mission

The Frontend Specialist is responsible for building and maintaining a cohesive, high-performance user interface for the Solennix. This agent ensures that the application is visually consistent, accessible, and provides a seamless user experience across modules like Event Management, Inventory, and Financial Dashboards. It bridges the gap between raw data (Supabase) and user interactions.

## Responsibilities

- **Component Development**: Create reusable UI components using Tailwind CSS and Radix UI primitives.
- **State Management**: Manage application state using React Context (AuthContext) and local state hooks.
- **Form Handling**: Implement complex forms for event creation, product management, and settings using robust validation.
- **Data Visualization**: Maintain and enhance the Dashboard's financial and operational metrics.
- **Document Generation**: Manage client-side PDF generation for budgets and contracts.
- **Integration**: Connect frontend views to Supabase services and handle real-time updates.

## Best Practices

- **Utility-First Styling**: Always use the `cn()` utility from `src/lib/utils.ts` for conditional Tailwind classes to ensure consistent styling and avoid conflicts.
- **Consistency in Pages**: Follow the pattern of `PageName.tsx` for views and `components/` sub-directories for page-specific UI fragments (e.g., `src/pages/Events/components/`).
- **Auth Guarding**: Wrap protected views or actions using the `useAuth` hook and check for session validity before performing operations.
- **Loading & Error States**: Implement consistent loading skeletons and error boundaries for all data-fetching components.
- **Financial Calculations**: Never perform complex financial logic directly in UI components. Use the helpers in `src/lib/finance.ts` (e.g., `getEventTaxAmount`, `getEventNetSales`).
- **PDF Generation**: Use the central logic in `src/lib/pdfGenerator.ts` for all document exports to maintain branding consistency.

## Repository Starting Points

- `src/components/`: Core UI library (Buttons, Dialogs, Layout, etc.).
- `src/pages/`: Feature-specific views (Events, Inventory, Products, Dashboard).
- `src/contexts/`: Global application state and authentication.
- `src/lib/`: Shared utilities, PDF logic, and financial helpers.
- `src/hooks/`: Custom React hooks for shared logic.

## Key Files

- `src/App.tsx`: Main routing and application entry point.
- `src/contexts/AuthContext.tsx`: Critical for session management and user profiles.
- `src/pages/Dashboard.tsx`: Primary metrics and data visualization logic.
- `src/pages/Events/EventForm.tsx`: The most complex form interaction in the app.
- `src/lib/pdfGenerator.ts`: Logic for generating legal and financial documents.
- `src/components/Layout.tsx`: The shell of the application including navigation.

## Architecture Context

### UI Layer (React + Tailwind)
- **Directories**: `src/components`, `src/pages`
- **Pattern**: Functional components with hooks. Uses Lucide-React for icons.
- **Key Files**: `src/components/Layout.tsx`, `src/components/ConfirmDialog.tsx`.

### Data Flow & Integration
- **Contexts**: `AuthContext.tsx` manages the Supabase session.
- **Services**: Supabase client in `src/lib/supabase.ts` provides the backend interface.
- **Helpers**: `src/lib/finance.ts` ensures business logic is decoupled from the UI.

### Document Logic
- **Tools**: PDF generation occurs in the browser using `jspdf` / `jspdf-autotable`.
- **Key Exports**: `generateBudgetPDF`, `generateContractPDF`.

## Key Symbols

- `useAuth`: Exported from `AuthContext.tsx`, used for accessing user profile and session.
- `cn`: Exported from `utils.ts`, standard for Tailwind class merging.
- `EventFinancialsProps`: Interface defining the data requirements for event money tracking.
- `isSupabaseConfigured`: Utility to check if environment variables are set correctly.

## Common Workflows

### 1. Creating a New Feature Page
1. Create the page component in `src/pages/`.
2. Add the route to `src/App.tsx` within the protected or public route wrapper.
3. If the page requires data, use `useEffect` with Supabase calls or specialized service functions.
4. Add a navigation link in `src/components/Layout.tsx`.

### 2. Adding a New Field to Event Management
1. Update the interface in the relevant component (e.g., `EventGeneralInfoProps`).
2. Update the Supabase schema (via migrations) and reflect changes in the TypeScript types.
3. Add the input field in `src/pages/Events/components/EventGeneralInfo.tsx`.
4. Ensure the `EventForm.tsx` handles the state update and persistence.

### 3. Enhancing Financial Reports
1. Modify logic in `src/lib/finance.ts` if calculation logic changes.
2. Update `src/pages/Dashboard.tsx` or `src/pages/Events/components/EventFinancials.tsx` to reflect the new metrics.
3. Use `Intl.NumberFormat` for currency consistency (BRL).

## Collaboration Checklist

1. **Verify Auth**: Does the new UI handle unauthorized states?
2. **Mobile Responsiveness**: Does the layout break on smaller screens? (Standard for the Solennix).
3. **Utility Usage**: Are styles using the `cn` helper and Tailwind?
4. **Logic Separation**: Are financial calculations extracted to `src/lib/finance.ts`?
5. **PDF Consistency**: If changes affect contracts or budgets, has `pdfGenerator.ts` been updated?

## Hand-off Notes

- **Form State**: Watch out for nested state in the `EventForm`. It manages several sub-components like `Payments`, `EventProducts`, and `EventExtras`.
- **Supabase Connectivity**: Ensure `isSupabaseConfigured` is checked in entry points to prevent crashes in unconfigured environments.
- **Performance**: Large event lists or complex financial tables should be optimized to prevent re-render lags.
