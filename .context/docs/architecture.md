# Architecture Notes

The `solennix` is built as a modern, client-heavy web application using React and TypeScript, leveraging Supabase as a Backend-as-a-Service (BaaS). The system follows a modular architecture where the frontend manages state, routing, and business logic orchestration, while the data persistence and authentication are delegated to Supabase. This design was chosen to minimize backend infrastructure overhead while providing real-time capabilities and robust security through Row Level Security (RLS).

The application is structured to separate concerns between UI presentation (components), state management (contexts), and data access (services). A central theme is the automation of event management workflows, including budget generation and contract PDF creation, which are handled via client-side utility libraries.

## System Architecture Overview

The system follows a **Modular Monolith** frontend topology deployed as a Single Page Application (SPA).

1.  **Client Layer**: A React SPA that handles all user interactions. Requests are initiated from UI components, processed through specific services, and dispatched to external APIs or the database.
2.  **Service/Logic Layer**: Orchestrates business rules (e.g., calculating event taxes, managing inventory costs) before they reach the persistence layer.
3.  **Data/Auth Layer (Supabase)**: Acts as the primary data store (PostgreSQL) and authentication provider. Control pivots here for session management and data integrity via RLS policies.
4.  **Integration Layer**: External libraries for PDF generation (`jspdf`, `jspdf-autotable`) and UI styling (Tailwind CSS, Shadcn UI).

## Architectural Layers

- **Services**: Business logic and data orchestration (`src/services/`). These modules abstract the Supabase client calls into domain-specific functions for Events, Products, Inventory, and Payments.
- **Utils/Lib**: Shared utilities and helper functions (`src/lib/`). Contains critical logic for financial calculations, PDF generation, and error handling.
- **Contexts**: Global state management (`src/contexts/`). Primarily manages user authentication sessions and profile data across the application.
- **Components**: Reusable UI elements (`src/components/`). Follows an atomic-like design where small units are composed into larger views.
- **Pages**: Top-level views and routing endpoints (`src/pages/`). Each domain (Events, Products, Clients) has its own directory containing specific forms and list views.
- **Hooks**: Custom React hooks for reusable logic (`src/hooks/`), such as theme switching or data fetching patterns.

> See [`codebase-map.json`](./codebase-map.json) for complete symbol counts and dependency graphs.

## Detected Design Patterns

| Pattern | Confidence | Locations | Description |
|---------|------------|-----------|-------------|
| **Service Pattern** | 95% | `src/services/` | Decouples UI components from the database schema by providing a functional API for CRUD operations. |
| **Context API** | 90% | `AuthContext.tsx` | Used for dependency injection and global state sharing (Authentication). |
| **Factory / Generator** | 85% | `pdfGenerator.ts` | Functions that transform raw event data into formatted PDF documents. |
| **Repository-lite** | 80% | `src/services/` | The services act as a thin repository layer over Supabase's PostgREST interface. |
| **Adapter** | 70% | `errorHandler.ts` | Normalizes various error types into a consistent format for the UI. |

## Entry Points

- [`src/main.tsx`](../src/main.tsx): The main application mount point.
- [`src/App.tsx`](../src/App.tsx): Root component containing the router, context providers, and global layout.

## Public API

| Symbol | Type | Location |
|--------|------|----------|
| `cn` | function | `src/lib/utils.ts` |
| `Database` | interface | `src/types/supabase.ts` |
| `generateBudgetPDF` | function | `src/lib/pdfGenerator.ts` |
| `generateContractPDF` | function | `src/lib/pdfGenerator.ts` |
| `getCurrentUserId` | function | `src/lib/supabase.ts` |
| `getErrorMessage` | function | `src/lib/errorHandler.ts` |
| `getEventNetSales` | function | `src/lib/finance.ts` |
| `getEventTaxAmount` | function | `src/lib/finance.ts` |
| `getEventTotalCharged` | function | `src/lib/finance.ts` |
| `isSupabaseConfigured` | function | `src/lib/supabase.ts` |
| `Json` | type | `src/types/supabase.ts` |
| `logError` | function | `src/lib/errorHandler.ts` |
| `useAuth` | function | `src/contexts/AuthContext.tsx` |
| `useTheme` | function | `src/hooks/useTheme.ts` |

## Internal System Boundaries

- **Domain Isolation**: Domains like `Events`, `Products`, and `Inventory` are kept distinct in the `src/pages` directory. Data ownership is maintained in PostgreSQL, but logic for cross-domain updates (like inventory deduction on event creation) is handled within the `src/services/` layer.
- **Authentication Boundary**: Managed strictly through the `AuthContext`. Protected routes in `App.tsx` prevent access to the internal application state unless a valid session is present.
- **Contract Enforcement**: TypeScript interfaces in `src/types/supabase.ts` (generated or manually maintained) act as the single source of truth for data structures between the frontend and the database.

## External Service Dependencies

- **Supabase**: Primary database (Postgres), Authentication (GoTrue), and Storage. Uses JWT for authentication and RLS for authorization.
- **Vite**: Build tool and development server.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Lucide React**: Icon library for UI consistency.

## Key Decisions & Trade-offs

1.  **Client-Side PDF Generation**: PDFs are generated in the browser using `jsPDF`. 
    - *Decision*: Avoids the need for a server-side printing service.
    - *Trade-off*: Complex layouts are harder to manage in code than HTML templates, but it reduces operational costs and latency.
2.  **Supabase as Backend**: 
    - *Decision*: Fast development cycle and built-in security.
    - *Trade-off*: Tight coupling to Supabase's API. Mitigation is attempted by wrapping calls in `src/services/`.
3.  **Financial Precision**: Logic in `src/lib/finance.ts` centralizes all currency calculations to prevent rounding errors or inconsistent totals across different views (Dashboard vs. Event Summary).

## Risks & Constraints

- **Scalability**: As the number of events and inventory items grows, client-side filtering and sorting in some views may become a bottleneck. Server-side pagination is recommended for future versions.
- **Connectivity**: Being a SPA dependent on a BaaS, the application requires a stable internet connection. There is currently no robust offline sync mechanism.
- **Security**: Reliance on Row Level Security (RLS). Any misconfiguration in Supabase policies could lead to data exposure, as the client has direct access to the database interface.

## Top Directories Snapshot

- `src/` — Main source code (100+ files)
- `src/pages/` — Main view components and routing targets (~40 files)
- `src/components/` — Shared UI building blocks (~25 files)
- `src/services/` — Database interaction logic (~10 files)
- `src/lib/` — Core utilities, PDF generation, and math (~8 files)
- `src/contexts/` — React Context providers for Auth and State (~2 files)
- `public/` — Static assets and logos
- `docs/` — System documentation and architecture notes

## Related Resources

- [Project Overview](./project-overview.md)
- [Data Flow Documentation](./data-flow.md)
- [Codebase Map](./codebase-map.json)
