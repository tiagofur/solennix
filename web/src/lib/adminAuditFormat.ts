import type { TFunction } from 'i18next';

/** Translate a security/product audit action code for admin UI. */
export function formatAdminLogAction(t: TFunction, action: string): string {
  const key = `admin:users.details.actions.${action}`;
  const translated = t(key);
  return translated !== key ? translated : action;
}

/**
 * Format audit details: prefer reason i18n when JSON has `reason`,
 * otherwise show action + resource or raw text.
 */
export function formatAdminLogDetails(
  t: TFunction,
  details: string | null | undefined,
  action: string,
  resourceType?: string | null,
): string {
  const actionLabel = formatAdminLogAction(t, action);

  if (!details) {
    return resourceType ? `${actionLabel} · ${resourceType}` : actionLabel;
  }

  if (details.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(details) as Record<string, unknown>;
      if (typeof parsed.reason === 'string' && parsed.reason) {
        const reasonKey = `admin:users.details.reasons.${parsed.reason}`;
        const translatedReason = t(reasonKey);
        const reasonStr =
          translatedReason !== reasonKey
            ? translatedReason
            : parsed.reason.replace(/_/g, ' ');
        return `${actionLabel}: ${reasonStr}`;
      }
      // Prefer human fields when present
      if (typeof parsed.plan === 'string') {
        return `${actionLabel}: plan=${parsed.plan}`;
      }
      return JSON.stringify(parsed);
    } catch {
      // fall through
    }
  }

  return details;
}
