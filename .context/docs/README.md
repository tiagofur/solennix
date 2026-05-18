# Documentation Index

Welcome to the **Solennix** technical documentation. This guide provides a comprehensive overview of the system architecture, development patterns, and core functionalities of the event management platform.

## Project Overview

Solennix is a specialized ERP solution designed for event planners and venue managers. Built with **React**, **TypeScript**, **Tailwind CSS**, and **Supabase**, it streamlines the lifecycle of event management—from inventory tracking and product costing to contract generation and financial reporting.

### Key Capabilities
- **Event Lifecycle Management**: Track events from initial inquiry to post-event settlement.
- **Inventory & Costing**: Manage raw materials (inventory) and link them to products to calculate real-time profit margins.
- **Financial Tracking**: Monitor payments, taxes, and net sales per event.
- **Document Generation**: Automated PDF generation for budgets and legal contracts.
- **Client CRM**: Centralized database for client history and contact information.

## Core Documentation Guides

| Guide | Description |
| --- | --- |
| [**Project Overview**](./project-overview.md) | High-level business goals, technology stack, and core features. |
| [**Architecture Notes**](./architecture.md) | Technical deep-dive into the service-oriented architecture and component hierarchy. |
| [**Development Workflow**](./development-workflow.md) | Setup instructions, branching strategies, and CI/CD pipelines. |
| [**Data Flow & Integrations**](./data-flow.md) | Database schema details (Supabase) and external service integrations. |
| [**Glossary & Domain Concepts**](./glossary.md) | Definitions for business logic (e.g., "Net Sales" vs "Total Charged"). |
| [**Security & Compliance**](./security.md) | Authentication flow, Row Level Security (RLS), and data protection. |
| [**Testing Strategy**](./testing-strategy.md) | Overview of Playwright E2E testing and unit testing patterns. |
| [**Tooling Guide**](./tooling.md) | CLI commands, Vite configuration, and developer productivity tips. |

## Repository Structure

The project follows a modular directory structure organized by responsibility:

```text
├── src/
│   ├── components/     # Shared UI components (Layout, Dialogs, etc.)
│   ├── contexts/       # Global state (Auth, Theme)
│   ├── hooks/          # Custom React hooks (useTheme, etc.)
│   ├── lib/            # Utilities (PDF generation, Math, Error handling)
│   ├── pages/          # Feature-based views (Events, Inventory, Products)
│   ├── services/       # Data access layer (Supabase clients)
│   └── types/          # TypeScript definitions and Database schema
├── supabase/           # Migrations and Edge Functions
├── tests/              # Playwright test suites
└── public/             # Static assets
```

## Developer Quick Start

### 1. Prerequisites
- Node.js (v18+)
- Supabase account and local CLI
- `pnpm` or `npm`

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Key Commands
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run E2E tests
pnpm exec playwright test
```

## Technical Foundation

### Public API & Utilities
- **`useAuth()`**: Access current session and profile data.
- **`generateBudgetPDF(event, profile)`**: Generates a professional budget document using `jspdf`.
- **`cn(...inputs)`**: Utility for conditional Tailwind class merging.
- **`getEventNetSales(event)`**: Calculates revenue after taxes and costs.

### Database Integration
The application uses **Supabase** for backend services. Type safety is maintained via generated types in `src/types/supabase.ts`. All data operations are abstracted into the `src/services/` layer to decouple UI components from the database implementation.

---

*For security audits, please refer to [SECURITY_AUDIT.md](../SECURITY_AUDIT.md) in the root directory.*
