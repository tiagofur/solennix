# Feature Developer Playbook - Solennix

This playbook provides the context, workflows, and standards for a Feature Developer agent working on the Solennix repository.

## 1. Role Overview
The Feature Developer is responsible for implementing new features, UI components, and business logic. The primary focus is on expanding the event management capabilities, including product tracking, financials, and payment processing.

## 2. Technical Stack & Architecture
- **Frontend**: React (Vite) with TypeScript.
- **Styling**: Tailwind CSS for utility-first styling.
- **Icons**: Lucide React.
- **Data Layer**: Direct integration with Supabase for authentication and database operations.
- **Component Pattern**: Functional components with hooks; heavy use of modular sub-components for complex pages like "Events".

## 3. Core Directory Map
- `src/pages/`: Main application views (Events, Products, Inventory, Clients, Calendar).
- `src/pages/Events/components/`: Modularized parts of the Event management interface.
- `src/components/`: Reusable UI components (Layout, Dialogs, Inputs).
- `src/lib/`: Shared utilities and service wrappers (Supabase client, Error handling).
- `src/types/`: TypeScript interfaces and type definitions.

## 4. Key Workflows

### Implementing a New Management Page
1.  **Define Types**: Create or update TypeScript interfaces in `src/types/` or locally if specific to the page.
2.  **Create Page Component**: Setup the main page in `src/pages/[FeatureName].tsx`.
3.  **Setup State/Data Fetching**: Use Supabase client directly within `useEffect` or custom hooks for data fetching.
4.  **Build Components**: Decompose complex UI into smaller components in a local `components/` subfolder.
5.  **Add Routing**: Register the new route in `src/App.tsx`.
6.  **Navigation**: Add the item to the Sidebar in `src/components/Layout.tsx`.

### Adding Features to the "Events" Module
The Events module is the most complex. Follow these steps when modifying it:
1.  **Identify Sub-component**: Determine if the change belongs in `EventGeneralInfo`, `EventProducts`, `EventFinancials`, or `Payments`.
2.  **Prop Passing**: Most event sub-components receive an `eventId` or the event object. Ensure types are updated in the respective `Props` interfaces.
3.  **Service Logic**: If adding a new database interaction, use the Supabase client. Follow the pattern in `Payments.tsx` (e.g., `loadPayments`, `onSubmit`, `handleDelete`).

## 5. Coding Standards & Best Practices

### Component Design
- Use **TypeScript interfaces** for all component props (e.g., `EventProductsProps`).
- Prefer **destructured props** in component signatures.
- Use **Lucide React** for icons to maintain visual consistency.
- Implement **loading states** and **error handling** using the shared `logError` utility from `src/lib/errorHandler.ts`.

### Styling
- Use **Tailwind CSS** classes.
- Follow the existing color palette (primarily `indigo` for primary actions, `red` for deletions).
- Use the `Layout` component to wrap all top-level pages for consistent sidebar and header behavior.

### Data Management
- Import `supabase` from `src/lib/supabase.ts`.
- Use `.select()`, `.insert()`, `.update()`, and `.delete()` patterns.
- Always filter queries by `id` or `event_id` where applicable to ensure data integrity.

### Error Handling
- Wrap async operations in `try-catch` blocks.
- Use `logError(error, 'context-name')` to ensure consistent error reporting.

## 6. Common Patterns

### Deletion with Confirmation
Use the `ConfirmDialog` component for all destructive actions.
```tsx
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
// ...
<ConfirmDialog
  isOpen={isDeleteDialogOpen}
  onClose={() => setIsDeleteDialogOpen(false)}
  onConfirm={handleDelete}
  title="Confirm Deletion"
  description="Are you sure? This action cannot be undone."
/>
```

### Form Handling in Modals
Most entity creation/editing (Products, Payments) uses local state within a modal.
- Use `isOpen` state to control modal visibility.
- Reset form state when the modal closes or after a successful submission.

## 7. Key Files for Reference
- `src/lib/supabase.ts`: Database client configuration.
- `src/lib/errorHandler.ts`: Standardized error logging.
- `src/pages/Events/components/Payments.tsx`: Excellent example of a CRUD sub-module with Supabase integration.
- `src/components/Layout.tsx`: The main navigation and application shell.

## 8. Feature Checklist
- [ ] TypeScript types defined/updated.
- [ ] Responsive UI using Tailwind.
- [ ] Loading states implemented.
- [ ] Error handling with `logError`.
- [ ] Form validation (where applicable).
- [ ] Database interactions verified with Supabase.
- [ ] Component decomposed if it exceeds 200 lines.
