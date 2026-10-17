import React, { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("turnstile script")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => {
        scriptPromise = null;
        reject(new Error("turnstile script"));
      }, { once: true });
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function isTurnstileConfigured(): boolean {
  return Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);
}

export interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

/**
 * Cloudflare Turnstile widget (no extra dependency).
 * Renders nothing when VITE_TURNSTILE_SITE_KEY is unset (dev mode:
 * backend skips verification without TURNSTILE_SECRET_KEY).
 */
export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  onVerify,
  onExpire,
  onError,
}) => {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onVerify, onExpire, onError });
  callbacksRef.current = { onVerify, onExpire, onError };

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let widgetId: string | null = null;
    let cancelled = false;
    loadTurnstileScript().then(
      () => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => callbacksRef.current.onVerify(token),
          "expired-callback": () => callbacksRef.current.onExpire?.(),
          "error-callback": () => callbacksRef.current.onError?.(),
        });
      },
      () => callbacksRef.current.onError?.(),
    );
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // best-effort
        }
      }
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={containerRef} data-testid="turnstile-widget" />;
};
