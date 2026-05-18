# Development Workflow

The engineering process for the Solennix repository is designed to ensure high code quality and consistent feature delivery. Our day-to-day workflow follows a standard feature-driven approach:

1.  **Task Identification**: Developers pick up tasks from the project backlog. Each task should have a clear scope and objective.
2.  **Implementation**: Features are developed in isolation using dedicated feature branches.
3.  **Local Verification**: Before submitting code, developers must verify changes locally by running the development server and performing manual smoke tests.
4.  **Integration**: Code is merged into the main branch only after successful code review and automated checks (if applicable).
5.  **State Management**: Since the application relies heavily on Supabase, developers should ensure that any local changes requiring schema updates are coordinated with the database migration process.

## Branching & Releases

We use a **Trunk-Based Development** model to maintain a high velocity while ensuring stability.

-   **Main Branch**: The `main` branch is the source of truth. It should always be in a deployable state.
-   **Feature Branches**: Use short-lived branches for specific features or bug fixes. Convention: `feature/description` or `fix/description`.
-   **Release Strategy**: We practice continuous delivery. Merges to `main` are automatically prepared for production deployment.
-   **Tagging**: Releases are tagged using Semantic Versioning (e.g., `v1.0.0`). Tags are typically created during significant milestone completions.

## Local Development

Follow these steps to set up the environment and run the application locally.

-   **Install Dependencies**: Use npm to install the required packages.
    ```bash
    npm install
    ```
-   **Environment Setup**: Ensure you have a `.env` file with the necessary Supabase credentials (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`). Use `isSupabaseConfigured()` from `src/lib/supabase.ts` to verify your setup.
-   **Run Locally**: Start the Vite development server.
    ```bash
    npm run dev
    ```
-   **Build for Distribution**: Generate a production-ready build in the `dist/` directory.
    ```bash
    npm run build
    ```
-   **Preview Build**: Preview the production build locally.
    ```bash
    npm run preview
    ```

## Code Review Expectations

Code reviews are a critical part of our quality assurance process. Every Pull Request (PR) requires at least one approval from a peer or lead developer.

**Reviewer Checklist:**
-   **Functionality**: Does the code solve the intended problem?
-   **Architecture**: Does it follow the established service/controller pattern? (e.g., logic in `src/services`, UI in `src/pages`).
-   **Error Handling**: Are errors caught using `logError` and displayed via `getErrorMessage` from `src/lib/errorHandler.ts`?
-   **Styling**: Are components utilizing the `cn` utility for Tailwind class merging?
-   **Types**: Are TypeScript interfaces/types (especially `Database` types from `src/types/supabase.ts`) correctly utilized?

**Agent Collaboration**: When working with AI agents, refer to `AGENTS.md` for specific instructions on prompting and context sharing to maintain consistency with our architectural patterns.

## Onboarding Tasks

New developers should complete these tasks to familiarize themselves with the codebase:

1.  **Environment Setup**: Clone the repo and successfully run `npm run dev`.
2.  **Architecture Walkthrough**: Review `src/contexts/AuthContext.tsx` to understand session management and `src/services/` to see how we interact with Supabase.
3.  **UI Exploration**: Create a test "Inventory Item" and "Product" through the UI to understand the relationship between raw materials and final products.
4.  **First Ticket**: Look for issues labeled `good-first-issue` in the repository. These usually involve small UI tweaks in `src/components` or adding utility helpers in `src/lib`.

## Related Resources

- [Testing Strategy](./testing-strategy.md)
- [Tooling & Configuration](./tooling.md)
