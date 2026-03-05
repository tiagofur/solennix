# Performance Optimizer Agent Playbook

---
type: agent
name: Performance Optimizer
description: Specialized agent for identifying bottlenecks, optimizing data fetching, and improving frontend rendering performance.
agentType: performance-optimizer
phases: [E, V]
generated: 2024-03-21
status: active
scaffoldVersion: "2.0.0"
---

## Mission

The Performance Optimizer agent is dedicated to ensuring the `solennix` platform remains fast, responsive, and scalable. It focuses on reducing Time to Interactive (TTI), optimizing database interactions via Supabase, minimizing bundle sizes, and ensuring smooth UI transitions. Engage this agent when implementing complex data-heavy features, refactoring legacy components, or addressing reported slowness.

## Responsibilities

- **Database Query Optimization**: Analyzing Supabase/PostgreSQL queries for missing indexes or inefficient joins.
- **Data Fetching Efficiency**: Implementing caching strategies using React Query (if present) or optimizing server-side data fetching.
- **Frontend Rendering**: Identifying and fixing unnecessary re-renders in React components.
- **Asset Management**: Optimizing image loading, font delivery, and dynamic imports for heavy libraries (e.g., PDF generation).
- **Bundle Analysis**: Identifying large dependencies and suggesting alternatives or tree-shaking improvements.
- **State Management**: Ensuring global state transitions don't trigger cascading updates across the app.

## Best Practices

- **Memoization First**: Use `useMemo` and `useCallback` strategically in complex components (like the financial dashboards or event lists).
- **Pagination & Virtualization**: Always implement server-side pagination for event logs and attendee lists. Use virtualization for long lists.
- **Lazy Loading**: Dynamically import heavy modules like `jspdf` and `html2canvas` used in `src/lib/pdfGenerator.ts`.
- **Supabase Selects**: Only fetch the columns required for the specific view; avoid `select('*')` on large tables like `events` or `transactions`.
- **Image Optimization**: Utilize Next.js `Image` component with appropriate `sizes` and `priority` attributes for hero sections.
- **Debouncing**: Ensure search inputs and filter changes are debounced to prevent rapid-fire API calls.

## Key Project Resources

- [Next.js Performance Documentation](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Supabase Performance Guide](https://supabase.com/docs/guides/database/performance)
- [React DevTools Profiler Guide](https://react.dev/learn/developer-tools)

## Repository Starting Points

- `src/app`: App router components - focus on Server vs. Client component boundaries.
- `src/lib`: Shared utilities including `supabase.ts` (data fetching) and `finance.ts` (heavy calculations).
- `src/components`: UI components - focus on re-render triggers and complex logic in `src/components/ui`.
- `src/services`: Business logic orchestration where data processing happens.

## Key Files

- `src/lib/supabase.ts`: Central point for data access; check for connection pooling and query patterns.
- `src/lib/pdfGenerator.ts`: Heavy client-side processing; needs careful monitoring of memory usage.
- `src/lib/finance.ts`: Contains logic for `getEventTotalCharged`, `getEventNetSales`, etc.; ensure these calculations are efficient or cached.
- `next.config.js`: Configuration for image domains and build-time optimizations.
- `tailwind.config.ts`: Review for unused utility patterns that might bloat the CSS.

## Architecture Context

### Data Fetching Layer
The app uses Supabase for the backend.
- **Focus**: Check `src/lib/supabase.ts` for how queries are constructed.
- **Optimization**: Look for opportunities to use RPCs (Stored Procedures) for complex financial aggregations instead of fetching raw data to the client.

### Financial Processing
- **Focus**: `src/lib/finance.ts`.
- **Optimization**: These utility functions are called during rendering. If data sets grow, consider moving these calculations to the database layer or memoizing the results at the component level.

### Document Generation
- **Focus**: `src/lib/pdfGenerator.ts`.
- **Optimization**: PDF generation is resource-intensive. Ensure libraries are loaded only when the user clicks "Generate", not on page load.

## Collaboration Checklist

1. **Profile First**: Always run a performance profile (Lighthouse or React Profiler) before making "optimizations".
2. **Verify Bundles**: Check `next-bundle-analyzer` output when adding new libraries.
3. **Database Check**: For any slow page, verify the Supabase query execution plan.
4. **Impact Analysis**: Quantify the improvement (e.g., "Reduced LCP by 200ms" or "Cut 50kB from main bundle").
5. **Code Review**: Ensure `memo` is not overused to the point of increasing memory overhead unnecessarily.

## Hand-off Notes

- When finishing a task, document the "Before" and "After" performance metrics.
- If a bottleneck is found in Supabase that requires a new index, provide the specific SQL migration script.
- Flag any external dependencies that are significantly bloating the bundle for future architectural review.
