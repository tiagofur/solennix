# Glossary & Domain Concepts

The **Solennix** is a management system designed for event organizers and buffet services. It centralizes the lifecycle of an event, from initial client contact and inventory management to financial settlement and document generation. The domain is centered around the relationship between products (items offered), inventory (raw materials), and the events where these are consumed.

### Domain Entities

- **Event:** The central entity representing a scheduled gathering. it tracks dates, locations, guests, and financial status.
- **Product:** A sellable item or service (e.g., "Full Dinner Service", "Cocktail Package"). Products can be composed of multiple inventory items.
- **Inventory Item:** Raw materials or stock assets (e.g., "Wine bottles", "Chair rentals", "Flour") used to calculate costs and manage supplies.
- **Client:** The individual or entity contracting the services.
- **Payment:** A financial transaction linked to an event, tracking the progress of the total debt.
- **Extra:** Additional costs or services added to an event that are not standard products.

---

## Type Definitions

The system uses TypeScript to enforce data integrity across the frontend and the Supabase backend.

- **`Database`**: The complete schema definition generated from the Supabase PostgreSQL instance.
  - Location: `src/types/supabase.ts`
- **`Event` / `EventInsert` / `EventUpdate`**: Definitions for event records, including calculated fields like `total_amount`.
  - Location: `src/services/eventService.ts`
- **`Product` / `ProductIngredient`**: Definitions for sellable items and their composition.
  - Location: `src/services/productService.ts`
- **`InventoryItem`**: Represents stock levels and unit costs.
  - Location: `src/services/inventoryService.ts`
- **`Client`**: Contact and billing information for customers.
  - Location: `src/services/clientService.ts`
- **`Payment`**: Schema for tracking installments and payment methods.
  - Location: `src/services/paymentService.ts`
- **`UserProfile`**: Extension of the Auth user containing business-specific settings like `business_name`.
  - Location: `src/contexts/AuthContext.tsx`

---

## Enumerations

While many statuses are handled via string literals in TypeScript for flexibility with Supabase, the following conceptual enums drive the application logic:

- **Event Status**: `draft`, `confirmed`, `completed`, `cancelled`.
  - Surfaces in: `EventForm.tsx`, `Dashboard.tsx`.
- **Payment Method**: `cash`, `credit_card`, `bank_transfer`, `pix`.
  - Surfaces in: `Payments.tsx`.
- **View Mode**: `budget` vs `contract`.
  - Surfaces in: `EventSummary.tsx` to toggle between different PDF generation layouts.
- **Theme**: `light`, `dark`.
  - Managed by: `useTheme.ts`.

---

## Core Terms

- **Net Sales**: The total amount charged to the client minus the calculated cost of products and taxes.
  - Surfaced in: `src/lib/finance.ts` via `getEventNetSales`.
- **Budget (Orçamento)**: A preliminary financial proposal for an event. It does not imply a legal commitment until moved to a "Confirmed" state.
- **Ingredient**: In the context of a `Product`, an ingredient is a link to an `InventoryItem` with a specific quantity required for that product.
- **Tax Amount**: Calculated percentage based on the event total, used to determine final profitability.
  - Surfaced in: `src/lib/finance.ts` via `getEventTaxAmount`.
- **Total Charged**: The sum of all products and extras assigned to an event before costs are deducted.

---

## Acronyms & Abbreviations

- **PDF**: Portable Document Format. Used for generating Budgets and Contracts via `jspdf` and `jspdf-autotable`.
- **UI/UX**: User Interface / User Experience. Focused on the Shadcn/UI component implementation.
- **RDB**: Relational Database (Supabase/PostgreSQL).
- **Auth**: Authentication and Authorization services provided by `AuthContext.tsx`.

---

## Personas / Actors

### The Event Manager (Admin)
- **Goal**: Maintain high-level oversight of all events, track monthly revenue, and manage the product catalog.
- **Workflows**: Checking the Dashboard for upcoming events, analyzing "Net Sales" to ensure profitability, and updating global settings.
- **Pain Points**: Manual calculation of costs and the complexity of generating professional contracts.

### The Sales/Operations Staff
- **Goal**: Register new clients and build event proposals quickly.
- **Workflows**: Creating an "Event", adding "Products", and generating a "Budget PDF" to send to the client.
- **Pain Points**: Keeping track of which clients have paid their installments.

---

## Domain Rules & Invariants

- **Financial Integrity**: An event's `total_amount` must always be the sum of its `EventProducts` and `EventExtras`. This is managed through calculation utilities in `src/lib/finance.ts`.
- **Inventory Linkage**: A Product cannot be deleted if it is currently linked to an active Event (soft-enforced via UI confirmation).
- **Authentication**: Users can only access data belonging to their own `user_id`. This is enforced via PostgreSQL Row Level Security (RLS) and the `getCurrentUserId` utility.
- **PDF Generation**: Contracts must include the `business_name` and `contract_terms` defined in the User Settings. If missing, the system defaults to generic placeholders.
- **Currency**: All financial values are treated as `float` or `numeric` in the database but must be formatted to the local currency (e.g., BRL/Real) for display using `formatCurrency`.

## Related Resources

- [Project Overview](./project-overview.md)
