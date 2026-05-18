# Testing Strategy

The quality of the Solennix codebase is maintained through a multi-layered testing strategy that combines automated testing, static analysis, and strict quality gates. Our approach ensures that business logic—particularly financial calculations, PDF generation, and authentication flows—remains robust and regression-free as the application scales.

We prioritize testing for:
- **Core Utilities**: Math and finance logic in `src/lib/finance.ts`.
- **Data Services**: Interactions with Supabase in `src/services`.
- **Complex Components**: Forms and summaries in `src/pages/Events`.
- **Security**: Authentication state and protected route transitions.

## Test Types

- **Unit Tests**:
    - **Framework**: Vitest (compatible with Vite/Jest syntax)
    - **Naming Convention**: `*.test.ts` or `*.test.tsx` located adjacent to the file under test.
    - **Focus**: Testing isolated functions in `src/lib` (e.g., `getEventNetSales`, `formatCurrency`) and pure utility logic.
- **Integration Tests**:
    - **Framework**: Vitest + React Testing Library
    - **Naming Convention**: `*.spec.tsx`
    - **Focus**: Testing component interactions within `src/components` and `src/pages`. These tests mock Supabase responses to verify that UI components correctly handle data loading, error states, and user input.
- **End-to-End (E2E) Tests**:
    - **Framework**: Playwright
    - **Location**: `tests/e2e/*.spec.ts`
    - **Focus**: Critical path scenarios such as "Create an Event and Generate a PDF Budget" or "User Registration and Login Flow." These run against a staging environment or a local production build.

## Running Tests

Execution commands are managed via `npm` scripts:

- **Run all unit and integration tests**:
  ```bash
  npm run test
  ```
- **Watch mode (Development)**:
  ```bash
  npm run test:watch
  ```
- **Generate coverage report**:
  ```bash
  npm run test:coverage
  ```
- **Run E2E tests**:
  ```bash
  npx playwright test
  ```
- **Open E2E UI mode**:
  ```bash
  npx playwright test --ui
  ```

## Quality Gates

Before any code is merged into the `main` branch, it must pass the following quality checks:

1. **Linting & Formatting**:
    - Must pass `npm run lint` (ESLint).
    - Must match Prettier configuration (checked via CI).
2. **Type Safety**:
    - Successful TypeScript compilation via `npm run type-check`.
3. **Minimum Coverage Requirements**:
    - **Global Coverage**: 70%
    - **Critical Libs (`src/lib/finance.ts`, `src/lib/pdfGenerator.ts`)**: 90%
    - **Services**: 80%
4. **CI Pipeline**:
    - All tests must pass in the GitHub Actions environment.
    - Build process (`npm run build`) must complete without errors.

## Troubleshooting

### Flaky Tests
- **Supabase Mocking**: If tests fail intermittently, check if `vi.mock('@supabase/supabase-js')` is being properly reset between tests using `vi.clearAllMocks()`.
- **Asynchronous UI**: When testing components like `EventForm`, ensure you use `findBy` queries or `waitFor` to account for state updates and effects.

### Environment Quirks
- **PDF Generation**: Tests for `generateBudgetPDF` may require mocking the `jspdf` and `jspdf-autotable` libraries as they rely on browser APIs that might not be fully present in the test environment (jsdom).
- **Authentication State**: If a test fails with "User not authenticated," verify that the `AuthContext` provider is correctly wrapped around the component in the test render function.

## Related Resources

- [development-workflow.md](./development-workflow.md)
