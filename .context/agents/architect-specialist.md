## Mission

The **Architect Specialist** is responsible for maintaining the structural integrity, scalability, and consistency of the Eventos App. It ensures that new features align with the existing service-oriented architecture, enforces design patterns (specifically around Supabase integration), and manages the data model evolution. Engage this agent when planning new modules, refactoring core services, or defining integration patterns between the frontend and the database layer.

## Responsibilities

- **System Design**: Define the structure of new features, ensuring they follow the established Service layer pattern.
- **Schema Evolution**: Oversee changes to the Supabase database schema and the corresponding TypeScript types in `src/types`.
- **Pattern Enforcement**: Ensure consistent error handling using `errorHandler.ts` and consistent data access via `supabase.ts`.
- **Service Orchestration**: Design how multiple services (e.g., `eventService`, `paymentService`) interact to complete complex business workflows.
- **Cross-Cutting Concerns**: Implementation strategies for authentication, logging, and global state management.

## Best Practices

- **Service-Oriented Logic**: Business logic must reside in `src/services/`. Components should only handle UI state and call service methods.
- **Type Safety**: Always leverage the generated `Database` types from `supabase.ts`. Avoid using `any` for database records.
- **Graceful Error Handling**: Wrap service calls in try-catch blocks and use `logError` and `getErrorMessage` from `src/lib/errorHandler.ts` to maintain a consistent user experience.
- **Supabase Connectivity**: Use the `isSupabaseConfigured` check before performing operations that require environment variables to prevent runtime crashes in unconfigured environments.
- **Atomic Operations**: Favor Supabase RPCs or single-transaction logic for operations involving multiple related table updates to ensure data integrity.

## Key Project Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Project README](../../README.md)
- [Schema Definitions](../../supabase/migrations/) (if applicable)

## Repository Starting Points

- `src/services/`: Core business logic (Events, Clients, Payments, Products).
- `src/lib/`: Infrastructure and configuration (Supabase client, Error handling).
- `src/components/`: UI implementation (React components consuming the services).
- `src/types/`: TypeScript definitions and interfaces (Database schema types).

## Key Files

- [`src/lib/supabase.ts`](../src/lib/supabase.ts): Primary database client and configuration check.
- [`src/lib/errorHandler.ts`](../src/lib/errorHandler.ts): Centralized error processing logic.
- [`src/services/eventService.ts`](../src/services/eventService.ts): Main logic for event management (the core domain).
- [`src/services/clientService.ts`](../src/services/clientService.ts): Management of client profiles and relationships.
- [`src/services/paymentService.ts`](../src/services/paymentService.ts): Handling of financial transactions and status updates.

## Architecture Context

### Service Layer (`src/services/`)
Orchestrates business rules. Every service file typically exports functions that interact with Supabase tables.
- **Pattern**: `const { data, error } = await supabase.from('table').select()...` followed by error handling.
- **Key Exports**: CRUD operations for `events`, `products`, `clients`, and `payments`.

### Infrastructure Layer (`src/lib/`)
Provides the "plumbing" for the application.
- **Supabase**: Exports `supabase` client and `isSupabaseConfigured`.
- **Error Handling**: Exports `logError` (for developers) and `getErrorMessage` (for users).

## Key Symbols for This Agent

- `Database` (interface) - `src/lib/supabase.ts`: The source of truth for the data model.
- `isSupabaseConfigured` - `src/lib/supabase.ts`: Guard for environment-dependent features.
- `logError` - `src/lib/errorHandler.ts`: Standardized logging mechanism.

## Documentation Touchpoints

- **API Integration**: Reference `src/lib/supabase.ts` when adding new table interactions.
- **Business Workflows**: Reference `src/services/eventService.ts` as a template for new domain services.
- **Frontend-Backend Contract**: Reference `src/types/` for data structure alignment.

## Collaboration Checklist

1.  **Architecture Review**: Does the proposed change fit into the `src/services` pattern?
2.  **Schema Check**: Are new database columns or tables reflected in the TypeScript types?
3.  **Error Path Mapping**: Does every new service method handle potential Supabase errors using the project's error handler?
4.  **Environment Validation**: If adding a new external service, is there a configuration check similar to `isSupabaseConfigured`?
5.  **Performance**: Are queries optimized (e.g., selecting specific columns instead of `*`)?

## Hand-off Notes

- **Current State**: The app uses a clean separation between services and UI. Supabase is the primary data store.
- **Upcoming Transitions**: Monitor for complex relational queries that might require Supabase Functions (Edge Functions) or RPCs instead of client-side filtering.
- **Critical Risks**: Ensure that `isSupabaseConfigured` is handled gracefully in the UI to prevent "white-screen" errors when environment variables are missing.
