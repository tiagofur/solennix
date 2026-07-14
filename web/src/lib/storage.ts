/**
 * localStorage key management for sign-out hygiene (#874).
 *
 * Keys fall into three categories:
 * 1. Device-scoped preferences (theme, sidebar, language) — survive sign-out.
 * 2. Per-user onboarding dismissal (hideOnboarding_<userId>) — keyed by userId
 *    so it never leaks across users; survives sign-out for parity with iOS
 *    hasSeenOnboarding (#810 — same user must not replay onboarding).
 * 3. Session / leak-prone state (onboarding tips, local checklist drafts,
 *    Supabase auth tokens) — cleared on sign-out so a different user logging
 *    in on a shared device starts from a clean slate (#874).
 *
 * The denylist approach is deliberate: only explicitly-opted-in keys survive,
 * so any future key defaults to being cleared (secure-by-default against
 * cross-user context leakage on shared machines).
 */

/** Key patterns that must survive sign-out. */
const PERSISTED_KEY_PATTERNS: ReadonlyArray<RegExp> = [
  /^theme$/,
  /^sidebar-(collapsed|width)$/,
  /^i18nextLng$/,
  /^hideOnboarding_/, // per-user onboarding dismissal, keyed by userId
];

const isPersisted = (key: string): boolean =>
  PERSISTED_KEY_PATTERNS.some((re) => re.test(key));

/**
 * Removes all session-scoped and leak-prone localStorage keys.
 *
 * Preserves device preferences (theme, sidebar, language) and per-user
 * onboarding dismissals. Intended for the sign-out path (#874): on a shared
 * machine the next user logs into a clean local state.
 */
export const clearUserScopedStorage = (): void => {
  // Snapshot keys first — removing during iteration over localStorage.length
  // would shift indices and skip entries. localStorage.key(i) is the spec API.
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !isPersisted(key)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
};
