# Project Overview

The Solennix is a comprehensive event management platform designed to streamline the lifecycle of event planning, from initial budgeting to final contract generation. It provides tools for service providers to manage clients, inventory, products, and financial tracking, ensuring a professional and organized approach to event coordination.

## Codebase Reference

> **Detailed Analysis**: For complete symbol counts, architecture layers, and dependency graphs, see [`codebase-map.json`](./codebase-map.json).

## Quick Facts

- **Root**: `/Users/tiagofur/Desktop/creapolis/solennix`
- **Languages**: TypeScript (44 files), JavaScript (5 files)
- **Primary Entry**: `src/main.tsx`
- **Full analysis**: [`codebase-map.json`](./codebase-map.json)

## Entry Points

- [**Main Application Entry**](../src/main.tsx): The primary entry point that initializes the React application and attaches it to the DOM.
- [**App Shell**](../src/App.tsx#L24): The root component that sets up routing, global providers (Auth, Theme), and the main layout structure.
- [**Auth Context**](../src/contexts/AuthContext.tsx#L27): Manages the global authentication state and Supabase session initialization.

## Key Exports

- `Database` (Interface) — The central TypeScript schema for the Supabase database.
- `useAuth` (Hook) — Accesses user authentication state and methods (login, signout).
- `generateBudgetPDF` (Function) — Generates client-facing budget documents using `jsPDF`.
- `generateContractPDF` (Function) — Generates legal contracts based on event details.
- `cn` (Utility) — A standard utility for merging Tailwind CSS classes.
- `isSupabaseConfigured` (Utility) — Checks for necessary environment variables for backend connectivity.

> See [`codebase-map.json`](./codebase-map.json) for the complete list of exports and types.

## File Structure & Code Organization

- `src/components/` — Reusable UI components such as layouts, dialogs, and navigation elements.
- `src/contexts/` — Global state management providers, primarily focusing on Authentication.
- `src/hooks/` — Custom React hooks for theme management and shared logic.
- `src/lib/` — Core business logic, including PDF generation, financial calculations, and error handling.
- `src/pages/` — Feature-specific views including Dashboard, Events, Inventory, Products, and Clients.
- `src/services/` — Data fetching and persistence layer interacting directly with Supabase.
- `src/types/` — Shared TypeScript interfaces and types, including the generated database schema.
- `public/` — Static assets such as logos and icons.

## Technology Stack Summary

The project is built on a modern web stack centered around **React** and **TypeScript**. It utilizes **Vite** as the build tool for fast development cycles and **pnpm** for efficient package management. The backend-as-a-service is provided by **Supabase**, which handles authentication and PostgreSQL data storage. Code quality is enforced through **ESLint** and **PostCSS** for styling transformations.

## Core Framework Stack

- **Frontend**: React 18+ utilizing a component-based architecture and React Router for navigation.
- **Backend/Database**: Supabase (PostgreSQL) with Real-time capabilities for data persistence.
- **State Management**: Context API for global state (Auth) and local state management for form handling.
- **Architecture**: Service-oriented pattern in the `src/services` directory to decouple UI components from data fetching logic.

## UI & Interaction Libraries

- **Styling**: Tailwind CSS for utility-first responsive design.
- **Components**: Lucide-React for iconography and Radix UI primitives (via shadcn/ui patterns) for accessible interactive elements.
- **Documents**: `jsPDF` and `jspdf-autotable` for client-side PDF generation of budgets and contracts.
- **Theming**: Custom theme hook supporting light and dark modes.

## Development Tools Overview

- **Vite CLI**: Handles the development server (`npm run dev`) and production builds (`npm run build`).
- **Playwright**: Included for end-to-end testing (see `playwright.config.ts`).
- **Supabase CLI**: (Optional) Used for managing database migrations and local development environments.

## Getting Started Checklist

1. **Install Dependencies**: Run `pnpm install` to install all required packages.
2. **Environment Setup**: Create a `.env` file in the root with your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. **Start Development**: Run `pnpm run dev` to launch the local development server.
4. **Verify Connectivity**: Check the dashboard to ensure the "Supabase Not Configured" warning is absent.
5. **Run Tests**: Execute `pnpm test` to ensure the environment is correctly set up.

## Next Steps

For more detailed information, please refer to the following resources:
- Review [Architecture](./architecture.md) to understand the data flow between Services and Components.
- See [Tooling](./tooling.md) for a deep dive into the build and deployment process.
- Consult the [Development Workflow](./development-workflow.md) for contribution guidelines and coding standards.
