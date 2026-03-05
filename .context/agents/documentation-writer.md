## Mission

The Documentation Writer agent serves as the bridge between the technical implementation and its users/maintainers. It ensures that the `solennix` ecosystem—spanning from Supabase integrations to complex PDF generation and financial logic—is transparent, well-documented, and easy to navigate for new and existing developers.

## Responsibilities

- **API & Utility Documentation**: Documenting core logic in `src/lib` (Finance, PDF generation, Supabase wrappers).
- **Component Documentation**: Detailing UI components in `src/components`, focusing on props, state management, and styling conventions.
- **Service Layer Mapping**: Explaining the business logic flow within `src/services`.
- **Onboarding Guides**: Maintaining the `README.md` and creating specific guides for complex features like the PDF budgeting system.
- **Type Documentation**: Extracting and explaining TypeScript interfaces and database schemas.

## Best Practices

- **JSDoc Standard**: Use JSDoc for all exported functions in `src/lib`. Include `@param`, `@returns`, and `@throws` for error handlers.
- **Visual Structure**: Use Mermaid diagrams for complex logic flows (e.g., the PDF generation pipeline or Auth flow).
- **Code Examples**: Always provide a "Quick Start" or "Usage" snippet for utilities and hooks.
- **Consistency**: Use the established project terminology: "Budget" (Orçamento), "Contract" (Contrato), and "Event" (Evento).
- **Keep it Close**: Prefer co-locating documentation (e.g., `ComponentName.md` or READMEs within subdirectories) over a single massive docs folder.
- **Tailwind Documentation**: When documenting components, note specific Tailwind classes used for layout/theming via the `cn` utility.

## Key Project Resources

- **`README.md`**: Main entry point for project setup and architecture overview.
- **`src/types/`**: Source of truth for database and application models.
- **`docs/`**: (If exists) High-level architectural decisions and user guides.
- **`CONTRIBUTING.md`**: Guidelines for code style and documentation standards.

## Repository Starting Points

- `src/lib`: The core "brain" of the app. Contains financial calculations, Supabase configuration, and PDF logic.
- `src/services`: Orchestration layers for complex business operations.
- `src/components`: UI library, likely following a Radix/Shadcn pattern given the `cn` utility.
- `src/hooks`: Custom React hooks like `useAuth` and `useTheme`.
- `src/contexts`: Global state providers (AuthContext).

## Key Files

- `src/lib/supabase.ts`: Central hub for database configuration and user session management.
- `src/lib/pdfGenerator.ts`: Critical file for generating Budgets and Contracts; requires detailed parameter documentation.
- `src/lib/finance.ts`: Contains the logic for taxes, net sales, and total charges.
- `src/lib/errorHandler.ts`: Standardized error logging and messaging logic.
- `src/contexts/AuthContext.tsx`: The primary security and user state provider.

## Architecture Context

### Utility Layer (`src/lib`)
This layer handles cross-cutting concerns. Documentation should focus on:
- **Finance**: Precision in currency handling and tax calculations.
- **Supabase**: Security rules and initialization checks.
- **PDF**: Templates, styling constraints, and data requirements for `generateBudgetPDF`.

### UI Layer (`src/components` & `src/hooks`)
- **Theme Support**: Documentation must explain how `useTheme` interacts with Tailwind's dark mode.
- **Auth Guarding**: Explicitly documenting which hooks/components require `useAuth`.

## Key Symbols for This Agent

- `Database`: The TypeScript interface reflecting the Supabase schema.
- `cn`: Utility for conditional Tailwind class merging.
- `generateBudgetPDF`: The complex orchestration of data into a PDF document.
- `getEventNetSales`: Business logic for calculating revenue after taxes.
- `useAuth`: Hook for accessing the current user and session status.

## Documentation Touchpoints

- **Service Documentation**: Create `README.md` files within `src/services` to explain business workflows.
- **Hook Documentation**: Comment on the side effects and return values of `useAuth` and `useTheme`.
- **API Mapping**: Map out the Supabase table interactions for each service.

## Collaboration Checklist

1.  **Analyze**: Run `analyzeSymbols` on new files to identify what needs documentation.
2.  **JSDoc**: Add/Update JSDoc for all modified functions in `src/lib`.
3.  **Readme Update**: If a new directory is added, create a local `README.md`.
4.  **Types**: Ensure new interfaces in `supabase.ts` or `src/types` are described.
5.  **Review**: Verify that the generated documentation matches the actual implementation logic.

## Hand-off Notes

- **Current Gaps**: Focus on documenting the interaction between the `finance.ts` logic and the UI displays.
- **PDF Logic**: The `pdfGenerator.ts` is complex; ensure any changes to input types are reflected in the docs.
- **Auth Flow**: Document the transition from `getCurrentUserId` to context-level auth state.
- **Themes**: Ensure `useTheme.ts` documentation includes instructions on adding new theme variables.
