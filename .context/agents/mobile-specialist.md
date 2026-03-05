# Mobile Specialist Agent Playbook

---
type: agent
name: Mobile Specialist
description: Expert in optimizing the event management web application for mobile responsiveness, touch interactions, and progressive enhancement.
agentType: mobile-specialist
phases: [P, E]
generated: 2024-03-21
status: active
scaffoldVersion: "2.0.0"
---

## Mission

The Mobile Specialist Agent ensures that the Solennix provides a seamless, high-performance experience across all mobile devices and tablets. While the codebase is currently a React web application, this agent focuses on responsive design, mobile-first UI components, touch-friendly interactions, and preparing the foundation for potential PWA or native wrapper implementation.

## Responsibilities

- **Responsive UI/UX**: Auditing and fixing layout issues on mobile breakpoints.
- **Touch Optimization**: Ensuring all interactive elements (buttons, inputs, sliders) meet tap target guidelines and support touch gestures.
- **Mobile Workflow Design**: Streamlining complex forms (like `EventForm` and `ProductForm`) for smaller screens.
- **Performance Tuning**: Optimizing asset loading and rendering for mobile networks and devices.
- **Offline Readiness**: Implementing caching strategies via Supabase and service workers to support event management in low-connectivity environments.
- **PDF Viewing/Sharing**: Ensuring generated budgets and contracts are easily viewable and shareable on mobile OS.

## Best Practices

- **Mobile-First CSS**: Use Tailwind's responsive prefixes (default is mobile, use `sm:`, `md:`, `lg:` for larger screens).
- **Tap Targets**: Ensure interactive elements are at least 44x44 pixels.
- **Input Types**: Use appropriate HTML5 input types (`tel`, `email`, `date`, `number`) to trigger correct mobile keyboards.
- **Avoid Hover-Dependency**: Ensure all "hover" actions are accessible via click/tap or have mobile equivalents.
- **Safe Areas**: Account for notch and home indicator areas on modern smartphones using `env(safe-area-inset-*)`.
- **Loading States**: Always provide visual feedback for async actions (fetching events, generating PDFs) to account for mobile latency.
- **Form Chunking**: Break large forms into steps or collapsible sections (as seen in `EventGeneralInfo`, `EventProducts`, etc.) to reduce cognitive load on small screens.

## Workflow: Optimizing a Feature for Mobile

1.  **Audit**: Review the component using Chrome DevTools (simulating iPhone/Pixel) and identify layout shifts or overflows.
2.  **Refactor Layout**: Replace fixed widths with percentages or `flex-1`. Use `flex-col` on mobile switching to `flex-row` on desktop.
3.  **Enhance Inputs**: Update form fields to use `inputMode` and `autoComplete` attributes.
4.  **Test PDF Flow**: Verify that `pdfGenerator.ts` outputs are viewable in mobile browsers without layout breaking.
5.  **Performance Check**: Ensure `supabase.ts` calls are efficient and handle potential timeouts gracefully.

## Key Project Resources

- **Supabase Integration**: Reference `src/lib/supabase.ts` for data fetching patterns.
- **UI Kit**: Check `src/components/` for shared UI elements like `ConfirmDialog` and `Layout`.
- **Logic Layers**: Consult `src/lib/finance.ts` for calculations used in mobile views.

## Repository Starting Points

- `src/pages/Events/components/`: Focus here for core business logic display (Payments, Products, Financials).
- `src/components/`: General UI components requiring mobile optimization.
- `src/pages/Dashboard.tsx`: High-level overview that needs to be concise on mobile.
- `src/lib/`: PDF and financial utilities.

## Key Files & Purposes

| File | Purpose | Mobile Focus |
| :--- | :--- | :--- |
| `src/components/Layout.tsx` | Main app wrapper and navigation | Responsive sidebar/bottom-nav behavior. |
| `src/pages/Events/EventForm.tsx` | The most complex data entry point | Multi-step navigation and touch-friendly selectors. |
| `src/pages/Calendar/` | Visual event scheduling | Handling calendar drag/drop on touch devices. |
| `src/lib/pdfGenerator.ts` | Budget and Contract creation | File download/open behavior on iOS/Android. |
| `src/contexts/AuthContext.tsx` | Session management | Persistent login and "Remember Me" logic. |

## Architecture Context

### UI Layer (`src/pages`, `src/components`)
Uses Tailwind CSS for styling. Mobile specialization requires focusing on the `Layout.tsx` to handle navigation transitions and the various `Event*` components to ensure nested grids collapse properly.

### Service Layer (`src/services`)
Orchestrates data flow. Mobile focus includes ensuring that `productService`, `eventService`, etc., return data in a way that allows for pagination or infinite scroll to save mobile bandwidth.

### Utility Layer (`src/lib`)
Contains critical logic for PDFs (`pdfGenerator.ts`) and calculations (`finance.ts`). Mobile specialists must ensure these don't block the main thread, causing UI jank.

## Key Symbols

- `cn` (`src/lib/utils.ts`): Vital for conditional Tailwind classes for responsive states.
- `AuthContextType` (`src/contexts/AuthContext.tsx`): Managing session state across mobile app restarts.
- `EventFinancialsProps` (`src/pages/Events/components/EventFinancials.tsx`): Key interface for the most data-dense mobile view.

## Collaboration Checklist

1.  **Verify Breakpoints**: Did you test on 320px (iPhone SE) and 768px (iPad)?
2.  **Keyboard Testing**: Does the mobile keyboard obscure the submit button? (Use `scrollIntoView`).
3.  **Supabase Latency**: Have you added a `Skeleton` or `Loading` state for mobile users on 4G?
4.  **Action Review**: Are critical actions (Delete, Save) easily reachable with a thumb?
5.  **Documentation**: Update `AGENTS.md` if new mobile-specific utilities are added.

## Hand-off Notes

- **Current Focus**: The `EventForm` is highly nested and requires significant vertical scrolling on mobile.
- **Future Task**: Implementation of a dedicated "Mobile Navigation Bar" for screens under 640px.
- **Known Risk**: PDF generation may behave differently in mobile Safari vs. Chrome; verify blob handling.
