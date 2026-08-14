import { useCallback, useEffect, useState } from "react";
import {
  MANUAL_PLATFORM_KEY,
  MANUAL_PLATFORMS,
  type ManualPlatform,
} from "@/content/userManual";

function isPlatform(value: string | null): value is ManualPlatform {
  return value !== null && (MANUAL_PLATFORMS as string[]).includes(value);
}

function readStoredPlatform(): ManualPlatform {
  if (typeof window === "undefined") return "web";
  try {
    const raw = window.localStorage.getItem(MANUAL_PLATFORM_KEY);
    if (isPlatform(raw)) return raw;
  } catch {
    // private mode / blocked storage
  }
  return "web";
}

/**
 * Persists the user's preferred manual platform (Web / iOS / Android).
 */
export function useManualPlatform() {
  const [platform, setPlatformState] = useState<ManualPlatform>("web");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPlatformState(readStoredPlatform());
    setReady(true);
  }, []);

  const setPlatform = useCallback((next: ManualPlatform) => {
    setPlatformState(next);
    try {
      window.localStorage.setItem(MANUAL_PLATFORM_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  return { platform, setPlatform, ready };
}
