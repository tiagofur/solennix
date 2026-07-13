import { describe, it, expect } from 'vitest';
import { normalizePlan, isBasicPlan } from './plan';

describe('normalizePlan', () => {
  it('maps basic aliases to "basic"', () => {
    expect(normalizePlan('basic')).toBe('basic');
    expect(normalizePlan('gratis')).toBe('basic');
    expect(normalizePlan('free')).toBe('basic');
    expect(normalizePlan('plan_basic')).toBe('basic');
  });

  it('maps pro aliases to "pro"', () => {
    expect(normalizePlan('pro')).toBe('pro');
    expect(normalizePlan('plan_pro')).toBe('pro');
    expect(normalizePlan('premium')).toBe('pro');
  });

  it('maps business aliases to "business"', () => {
    expect(normalizePlan('business')).toBe('business');
    expect(normalizePlan('plan_business')).toBe('business');
    expect(normalizePlan('enterprise')).toBe('business');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(normalizePlan('  BASIC ')).toBe('basic');
    expect(normalizePlan('Pro')).toBe('pro');
    expect(normalizePlan(' Free')).toBe('basic');
  });

  it('passes unknown values through (lowercased) without coercing to a tier', () => {
    expect(normalizePlan('unknown')).toBe('unknown');
    expect(normalizePlan('CustomTier')).toBe('customtier');
  });

  it('defaults nullish input to "basic"', () => {
    expect(normalizePlan(undefined)).toBe('basic');
    expect(normalizePlan(null)).toBe('basic');
    expect(normalizePlan('')).toBe('basic');
  });
});

describe('isBasicPlan', () => {
  it('returns true for basic aliases', () => {
    expect(isBasicPlan('basic')).toBe(true);
    expect(isBasicPlan('gratis')).toBe(true);
    expect(isBasicPlan('plan_basic')).toBe(true);
  });

  it('returns false for paid tiers', () => {
    expect(isBasicPlan('pro')).toBe(false);
    expect(isBasicPlan('business')).toBe(false);
    expect(isBasicPlan('premium')).toBe(false);
  });

  it('returns true for nullish input (legacy users default to basic)', () => {
    expect(isBasicPlan(undefined)).toBe(true);
    expect(isBasicPlan(null)).toBe(true);
  });

  it('returns false for unknown tiers (not coerced to basic)', () => {
    expect(isBasicPlan('unknown')).toBe(false);
  });
});
