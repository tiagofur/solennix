# Solennix - Product Requirements Document

## Overview
Solennix is a SaaS platform for event organizers (catering, banquets, parties). It manages the full event lifecycle: clients, product catalogs with recipes, inventory, quotations with tax (IVA), payments, calendar, and PDF document generation.

## Target Users
Event organizers, catering businesses, banquet halls, party planners in Mexico and Latin America.

## Core Features

### 1. Authentication
- Email/password login and registration
- Password recovery via email
- JWT-based session management
- Automatic token refresh on expiry

### 2. Dashboard
- Financial KPI cards: net sales, cash collected, VAT collected, VAT outstanding
- Monthly event status chart (quoted/confirmed/completed/cancelled)
- Financial comparison chart
- Upcoming events list (next 5)
- Low stock inventory alerts
- Onboarding checklist for new users

### 3. Client Management (CRM)
- Create, read, update, delete clients
- Client fields: name, phone, email, address, city, notes, photo
- Client list with search, sort, and pagination
- Client detail view with event history
- Export clients to CSV

### 4. Event Management
- 5-step event creation wizard:
  1. General Info: client, date, time, service type, guest count, status, location
  2. Products: select from catalog with quantities and unit prices
  3. Extras: ad-hoc line items (description, cost, price)
  4. Equipment: check conflicts, add equipment
  5. Financials: discount, tax rate, deposit %, cancellation policy
- Event statuses: quoted, confirmed, completed, cancelled
- Event summary with tabs: summary, ingredients, contract, payments, photos
- PDF generation: budget, contract, invoice, shopping list, payment report
- Stripe online payment integration
- Manual payment recording
- Photo upload gallery
- Equipment conflict detection (prevent double-booking)

### 5. Product Catalog
- Create, read, update, delete products
- Product fields: name, category, base_price, image
- Recipe management: link inventory ingredients with quantities
- Separate ingredient vs equipment cost tracking
- Product detail with recipe cost breakdown
- Plan limit: basic plan restricted to 20 catalog items

### 6. Inventory Management
- Create, read, update, delete inventory items
- Item types: ingredient and equipment
- Fields: name, type, current_stock, minimum_stock, unit, unit_cost
- Low stock alerts on dashboard
- Filter by type

### 7. Calendar
- Dual view: calendar grid and event list
- Month navigation
- Status filtering (quoted/confirmed/completed/cancelled)
- Search within events
- Export to CSV

### 8. Global Search
- Unified search across clients, events, products, inventory
- Categorized results with navigation links

### 9. Settings
- Profile: name, email, business name, logo, brand color
- Business settings
- Contract defaults: deposit %, cancellation days, refund %, template editor
- Subscription management via Stripe portal

### 10. Subscription Plans
- Basic (free): 3 events/month, 50 clients, 20 catalog items
- Pro ($99 MXN/month): unlimited everything
- Stripe checkout integration for upgrades
- Plan-gated features with upgrade banners

### 11. Admin Panel (platform admins only)
- Platform stats: total users, events, clients, products
- User management: list users, view details, force upgrade
- Plan distribution chart
- Signup trends

## Technical Requirements
- Responsive web application (React SPA)
- RESTful API backend (Go)
- PostgreSQL database
- Multi-tenant: all data scoped by user
- Dark/light theme support
- Spanish UI language
