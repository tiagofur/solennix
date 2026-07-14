import { describe, it, expect, beforeEach } from 'vitest';
import { clearUserScopedStorage } from './storage';

describe('clearUserScopedStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

 it('preserves device-scoped preferences', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('sidebar-collapsed', 'true');
    localStorage.setItem('sidebar-width', '280');
    localStorage.setItem('i18nextLng', 'es');

    clearUserScopedStorage();

    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('sidebar-collapsed')).toBe('true');
    expect(localStorage.getItem('sidebar-width')).toBe('280');
    expect(localStorage.getItem('i18nextLng')).toBe('es');
  });

  it('preserves per-user onboarding dismissal (keyed by userId)', () => {
    localStorage.setItem('hideOnboarding_user-123', 'true');
    localStorage.setItem('hideOnboarding_user-456', 'true');

    clearUserScopedStorage();

    expect(localStorage.getItem('hideOnboarding_user-123')).toBe('true');
    expect(localStorage.getItem('hideOnboarding_user-456')).toBe('true');
  });

  it('clears global onboarding tip state (eventosOnboardingShown)', () => {
    localStorage.setItem('eventosOnboardingShown', 'true');

    clearUserScopedStorage();

    expect(localStorage.getItem('eventosOnboardingShown')).toBeNull();
  });

  it('clears event-scoped checklist drafts', () => {
    localStorage.setItem('event_checklist_abc-123', '["item1","item2"]');
    localStorage.setItem('event_checklist_def-456', '[]');

    clearUserScopedStorage();

    expect(localStorage.getItem('event_checklist_abc-123')).toBeNull();
    expect(localStorage.getItem('event_checklist_def-456')).toBeNull();
  });

  it('clears team member portal detail state', () => {
    localStorage.setItem('team_event_detail:evt-789', '{}');

    clearUserScopedStorage();

    expect(localStorage.getItem('team_event_detail:evt-789')).toBeNull();
  });

  it('clears Supabase auth tokens', () => {
    localStorage.setItem('sb-xyz-auth-token', 'token-data');

    clearUserScopedStorage();

    expect(localStorage.getItem('sb-xyz-auth-token')).toBeNull();
  });

  it('clears unknown future keys by default (secure-by-default)', () => {
    localStorage.setItem('some-future-feature-state', 'data');
    localStorage.setItem('another-unknown-key', 'value');

    clearUserScopedStorage();

    expect(localStorage.getItem('some-future-feature-state')).toBeNull();
    expect(localStorage.getItem('another-unknown-key')).toBeNull();
  });

  it('handles empty localStorage gracefully', () => {
    expect(() => clearUserScopedStorage()).not.toThrow();
  });

  it('clears all session state while preserving device prefs together', () => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('hideOnboarding_user-1', 'true');
    localStorage.setItem('sidebar-width', '256');
    localStorage.setItem('event_checklist_evt-1', '["a"]');
    localStorage.setItem('eventosOnboardingShown', 'true');
    localStorage.setItem('sb-token-auth-token', 'tok');
    localStorage.setItem('mystery-key', '?');

    clearUserScopedStorage();

    expect(localStorage.getItem('theme')).toBe('light');
    expect(localStorage.getItem('hideOnboarding_user-1')).toBe('true');
    expect(localStorage.getItem('sidebar-width')).toBe('256');
    expect(localStorage.getItem('event_checklist_evt-1')).toBeNull();
    expect(localStorage.getItem('eventosOnboardingShown')).toBeNull();
    expect(localStorage.getItem('sb-token-auth-token')).toBeNull();
    expect(localStorage.getItem('mystery-key')).toBeNull();
  });
});
