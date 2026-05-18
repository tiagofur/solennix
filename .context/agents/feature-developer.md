# Feature Developer Agent Playbook

---
type: agent
name: Feature Developer
description: Expert agent for implementing end-to-end features, from UI components to database integration.
agentType: feature-developer
phases: [P, E]
generated: 2024-03-21
status: active
scaffoldVersion: "2.0.0"
---

## Mission

The Feature Developer agent is responsible for translating requirements into functional, high-quality code. It handles the complete lifecycle of a feature: UI design (React/Tailwind), state management, service layer orchestration, and Supabase database interactions. Engage this agent when you need to build new views, extend existing workflows (like event management), or implement complex business logic.

## Responsibilities

*   **UI/UX Implementation**: Building responsive interfaces using React, Lucide icons, and Tailwind CSS.
*   **Business Logic Orchestration**: Developing and refining services in `src/services` to handle CRUD operations and complex domain logic.
*   **State Management**: Managing local and global state (e.g., using `useState`, `useEffect`, and custom hooks).
*   **Database Integration**: Writing type-safe queries using the Supabase client and ensuring data integrity.
*   **Error Handling**: Implementing robust error catching using the project's `errorHandler.ts` patterns.
*   **Cross-Component Communication**: Ensuring seamless data flow between parent pages and nested components (e.g., `EventGeneralInfo` to `EventFinancials`).

## Best Practices

*   **Type Safety First**: Always use the generated `Database` types from `supabase.ts`. Ensure all props and state objects are strictly typed.
*   **Component Composition**: Break down large views into smaller, reusable components located in `src/pages/[Feature]/components`.
*   **Service Separation**: Never call Supabase directly from UI components. Logic should reside in `src/services/` to ensure portability and easier testing.
*   **Consistent Styling**: Use the existing Tailwind patterns. Prefer utility classes over custom CSS. Follow the existing layout patterns found in `src/components/Layout.tsx`.
*   **Loading & Error States**: Always implement loading spinners and error alerts for asynchronous operations. Use `logError` and `getErrorMessage` for consistent error reporting.
*   **Form Handling**: Follow the pattern of controlled components or specialized hooks for complex forms, ensuring validation occurs before service calls.

## Workflows & Common Tasks

### 1. Adding a New Data-Driven Feature
1.  **Define Types**: Update or verify types in `src/types/supabase.ts`.
2.  **Create Service**: Implement the CRUD logic in `src/services/[feature]Service.ts`.
3.  **Build UI Scaffold**: Create the main page in `src/pages/` and register the route.
4.  **Implement Components**: Break the UI into sub-components in `src/pages/[feature]/components`.
5.  **Connect State**: Use `useEffect` to fetch data on mount and `useState` for UI feedback.

### 2. Extending the Events Module
1.  Locate the specific sub-component (e.g., `EventProducts.tsx` or `Payments.tsx`).
2.  Update the props interface to include new data requirements.
3.  Modify the corresponding service (e.g., `eventService.ts`) to handle new fields.
4.  Update the `EventFinancials.tsx` if the changes affect pricing or totals.

## Repository Starting Points

*   `src/pages/`: Primary entry points for different application modules (Events, Products, Clients).
*   `src/services/`: The core business logic layer interacting with Supabase.
*   `src/components/`: Shared UI components like `Layout`, `ConfirmDialog`, and shared UI primitives.
*   `src/lib/`: Utility functions, specifically the `errorHandler.ts` for standardized error processing.

## Key Files

*   [`src/services/eventService.ts`](../src/services/eventService.ts): Main logic for event lifecycle management.
*   [`src/pages/Events/components/Payments.tsx`](../src/pages/Events/components/Payments.tsx): Reference for complex data fetching and submission logic.
*   [`src/pages/Events/components/EventFinancials.tsx`](../src/pages/Events/components/EventFinancials.tsx): Core logic for calculating event totals and managing related entities.
*   [`src/lib/errorHandler.ts`](../src/lib/errorHandler.ts): Standard for logging and user-facing error messages.
*   [`supabase.ts`](../supabase.ts): Source of truth for database types and schema.

## Architecture Context

### Services Layer (`src/services`)
Contains direct database interactions. Each service typically corresponds to a database table.
*   **eventService.ts**: Handles joins between events, clients, and financial records.
*   **productService.ts**: Manages inventory and pricing.

### UI Layer (`src/pages` & `src/components`)
*   **Pages**: Serve as containers that manage data fetching and high-level state.
*   **Components**: Pure or semi-pure UI elements. Local components (specific to a page) are nested in a `components/` subfolder within the page directory.

## Collaboration Checklist

1.  **Schema Alignment**: Confirm that any new fields match the Supabase table definitions.
2.  **Component Props**: Ensure new components follow the standard prop naming convention (e.g., `onUpdate`, `onDelete`).
3.  **UI Consistency**: Verify that new buttons, inputs, and modals match the design of `ConfirmDialog.tsx` and `Layout.tsx`.
4.  **Error Path**: Test the feature with "failure" scenarios (network error, validation error) to ensure `logError` is triggered.

## Hand-off Notes

*   **Remaining Tasks**: Note any UI refinements or edge-case validations not covered.
*   **Database Migration**: If the feature requires schema changes, specify the SQL required for Supabase.
*   **Dependencies**: List any new icons or libraries added during development.
