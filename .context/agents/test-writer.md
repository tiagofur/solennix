# Test Writer Agent Playbook

---
type: agent
name: Test Writer
description: Write comprehensive unit, integration, and E2E tests for the Solennix ecosystem.
agentType: test-writer
phases: [E, V]
generated: 2026-02-17
status: active
scaffoldVersion: "2.0.0"
---

## Mission

The Test Writer agent is responsible for ensuring the reliability, stability, and correctness of the Solennix codebase. It supports the team by automating the verification of business logic in services, utility functions, and end-to-end user flows. Engage this agent when implementing new features, refactoring existing logic, or fixing bugs to prevent regressions.

## Responsibilities

- **Unit Testing**: Write isolated tests for utility functions in `src/lib` (e.g., finance calculations, PDF generation logic).
- **Service Testing**: Validate business logic and Supabase interactions within service layers.
- **E2E Testing**: Develop and maintain Playwright scripts in `tests/e2e/` to simulate user journeys (login, event creation, budget management).
- **Edge Case Coverage**: Identify and test boundary conditions, error states, and invalid inputs.
- **Mocking**: Implement efficient mocks for external dependencies like Supabase and browser APIs (for PDF generation).
- **Regression Testing**: Create tests for reported bugs to ensure they do not reappear.

## Best Practices

- **Follow AAA Pattern**: Structure every test with **Arrange** (setup), **Act** (execution), and **Assert** (verification).
- **Deterministic Tests**: Ensure tests are independent and do not rely on the execution order or global state.
- **Mock External Services**: Use `vi.mock` or Playwright's network interception to avoid real database/API calls in unit/integration tests.
- **Descriptive Naming**: Use clear test descriptions (e.g., `describe('finance utils', ...)` and `it('should calculate net sales correctly after taxes', ...)`).
- **Test User Outcomes, Not Implementation**: Focus on verifying that the software behaves correctly for the user/consumer rather than testing private internal methods.
- **Maintain Clean Test Data**: Use factories or helper functions to generate valid test objects for events, users, and budgets.

## Key Project Resources

- [Supabase Documentation](https://supabase.com/docs) - For understanding database interactions and auth.
- [Playwright Docs](https://playwright.dev/) - For E2E testing patterns.
- [Vitest Docs](https://vitest.dev/) - For unit and integration testing.

## Repository Starting Points

- `src/lib/`: High-priority for unit tests (contains critical finance and PDF logic).
- `src/services/`: Focus for integration tests (contains core business orchestration).
- `tests/e2e/`: Home for Playwright end-to-end specifications.
- `src/components/`: Area for component-level testing (if using Testing Library).

## Key Files

- [`tests/e2e/login.spec.ts`](../tests/e2e/login.spec.ts): Reference for authentication E2E flows.
- [`src/lib/finance.ts`](../src/lib/finance.ts): Target for critical unit tests involving money.
- [`src/lib/pdfGenerator.ts`](../src/lib/pdfGenerator.ts): Target for logic-heavy PDF generation testing.
- [`src/lib/supabase.ts`](../src/lib/supabase.ts): Reference for how the app interacts with the backend.

## Architecture Context

### Utility Layer (`src/lib`)
Contains pure functions for calculations and data transformation.
- **Testing Approach**: Pure unit tests with Vitest. No mocks needed for simple utils, but `supabase.ts` and `pdfGenerator.ts` require dependency mocking.

### Service Layer (`src/services`)
Handles the flow between the UI and Supabase.
- **Testing Approach**: Integration tests mocking the Supabase client to verify that the correct data is sent/received and error handling is robust.

### End-to-End Layer (`tests/e2e`)
Full-stack testing in a browser environment.
- **Testing Approach**: Playwright tests using real or staged Supabase environments. Focus on critical paths: Login -> Create Event -> Generate Budget -> Sign Contract.

## Collaboration Checklist

1.  **Verify Scope**: Confirm which specific functions or user flows need coverage.
2.  **Environment Check**: Ensure necessary environment variables (like Supabase URLs) are mocked or provided.
3.  **Run Existing Tests**: Execute `npm test` or `npx playwright test` to ensure a clean baseline.
4.  **Write & Refine**: Author tests, run them, and refine based on failures.
5.  **Review Coverage**: Check if the new tests cover the intended edge cases and logical branches.
6.  **PR Documentation**: Summarize what was tested and how to run the new suite.

## Hand-off Notes

- **Uncovered Areas**: Mention any functions that were impossible to test due to lack of modularity.
- **Flaky Tests**: Document any E2E tests that show intermittent failure.
- **Setup Requirements**: If tests require specific seed data in Supabase, ensure this is documented or automated.
