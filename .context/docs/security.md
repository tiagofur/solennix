# Security & Compliance Notes

This document outlines the security architecture, policies, and compliance guardrails implemented within the Solennix. The application is designed with a "Security by Design" approach, leveraging industry-standard cloud providers and encryption methods to ensure the integrity and confidentiality of event management data, client information, and financial records.

Core security principles applied to the project:
*   **Least Privilege:** Users and services only have access to the data necessary for their specific roles.
*   **Data Isolation:** Multi-tenant architecture (via Supabase) ensures that data from different business profiles remains isolated.
*   **Secure Communication:** All data in transit is encrypted using TLS 1.2 or higher.
*   **Input Validation:** Strict validation is enforced at both the client-side (UI) and server-side (Database Constraints/RLS) to prevent injection attacks.

## Authentication & Authorization

The application utilizes **Supabase Auth** as the primary Identity Provider (IdP) to handle user lifecycles, including registration, login, and password recovery.

### Identity Management
*   **Provider:** Supabase Auth (GoTrue).
*   **Authentication Flow:** Email and Password (managed via `src/pages/Login.tsx` and `src/pages/Register.tsx`).
*   **Token Format:** JSON Web Tokens (JWT). The client receives an `access_token` and a `refresh_token`.
*   **Session Strategy:** JWTs are stored in local storage and automatically refreshed by the Supabase client. Session state is managed globally through the `AuthContext` (`src/contexts/AuthContext.tsx`).

### Authorization Model
The system employs **Row-Level Security (RLS)** within the PostgreSQL database to enforce authorization at the data layer. 
*   **User Identification:** The `getCurrentUserId` utility in `src/lib/supabase.ts` retrieves the UUID from the active session.
*   **Ownership-Based Access:** Most tables (Events, Clients, Products, Inventory) include a `user_id` or `profile_id` column. RLS policies are configured to ensure that a user can only `SELECT`, `INSERT`, `UPDATE`, or `DELETE` rows where the `user_id` matches their authenticated UUID.
*   **Role/Permission Model:** Currently, the system supports a single-user-per-organization model. Future iterations will include role-based access control (RBAC) to distinguish between 'Admin', 'Manager', and 'Staff' roles.

## Secrets & Sensitive Data

Proper management of secrets is critical to preventing unauthorized access to the database and third-party services.

### Storage & Management
*   **Environment Variables:** Sensitive configuration such as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are managed via `.env` files for local development. In production environments (e.g., Netlify, Vercel), these are stored as encrypted Environment Variables.
*   **Client-Side Exposure:** Only "Public/Anonymous" keys are exposed to the browser. Sensitive "Service Role" keys are never included in the frontend build.
*   **Database Credentials:** Direct database connection strings are never stored in the application code. All database interactions occur through the Supabase client API.

### Encryption Practices
*   **Encryption at Rest:** All data stored in the Supabase PostgreSQL database is encrypted at rest by the cloud provider.
*   **Encryption in Transit:** All API calls to Supabase and external services are forced over HTTPS.
*   **PDF Generation:** Budget and Contract PDFs (`src/lib/pdfGenerator.ts`) are generated client-side to ensure that sensitive contract details do not transit to a third-party generation server.

### Data Classification
*   **Restricted:** Client PII (Names, Phone Numbers, Emails), Event Financials, and Business Contract Templates.
*   **Internal:** Inventory costs, product ingredients, and internal profit margins.
*   **Public:** Application UI assets and public-facing documentation.

## Compliance & Policies

The application is built to align with general data protection standards, specifically focusing on the needs of small to medium event businesses.

*   **GDPR (General Data Protection Regulation):** 
    *   **Right to Erasure:** Users can request deletion of their account and associated client data.
    *   **Data Portability:** Financial and event data can be exported (via PDF) or queried through the interface.
*   **Internal Audit Trails:** The database schema includes `created_at` and `updated_at` timestamps for critical records to track data lifecycle changes.
*   **Password Policy:** Supabase Auth enforces minimum password complexity requirements and provides secure password reset flows via `src/pages/ForgotPassword.tsx`.

## Incident Response

In the event of a security breach or service interruption, the following protocol is followed:

1.  **Detection:** Monitoring of Supabase logs and client-side error reporting (via `src/lib/errorHandler.ts`).
2.  **Triage:** Use `logError` to capture context and determine if the issue is a systemic vulnerability or an isolated application error.
3.  **Containment:** If a secret (e.g., Anon Key) is compromised, it must be rotated immediately in the Supabase dashboard and production environment settings.
4.  **Communication:** In the event of PII exposure, affected users will be notified via their registered email addresses as per regulatory requirements.
5.  **Recovery:** Restoration of service from automated daily database backups provided by the Supabase platform.

## Related Resources

- [architecture.md](./architecture.md) - For a detailed view of the system components and data flow.
- [Supabase Security Documentation](https://supabase.com/docs/guides/auth) - For underlying infrastructure security details.
