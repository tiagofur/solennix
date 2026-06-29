import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

interface Props {
  onError?: (message: string) => void;
}

export const GoogleSignInButton: React.FC<Props> = ({ onError }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const initializedRef = useRef(false);
  const onErrorRef = useRef(onError);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const handleCredentialResponse = useCallback(async (
    response: google.accounts.id.CredentialResponse
  ) => {
    setIsLoading(true);
    try {
      await api.post("/auth/google", { id_token: response.credential });
      await checkAuth();
      navigate("/dashboard");
    } catch (err: any) {
      onErrorRef.current?.(err.message || t("common:auth.sign_in_error_google"));
    } finally {
      setIsLoading(false);
    }
  }, [checkAuth, navigate, t]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let timerId: NodeJS.Timeout | null = null;

    const initializeGsi = () => {
      if (typeof google === "undefined" || !google.accounts?.id) {
        timerId = setTimeout(initializeGsi, 200);
        return;
      }

      if (initializedRef.current) {
        setGsiReady(true);
        return;
      }

      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        button_auto_select: false,
        use_fedcm_for_button: false,
      });

      initializedRef.current = true;
      setGsiReady(true);
    };

    initializeGsi();

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [handleCredentialResponse]);

  const renderButton = useCallback(() => {
    if (!gsiReady) return;

    const container = containerRef.current;
    if (container) {
      const width = Math.max(220, Math.floor(container.getBoundingClientRect().width));
      container.innerHTML = "";
      google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        width,
        text: "continue_with",
        shape: "rectangular",
      });
    }
  }, [gsiReady]);

  useEffect(() => {
    renderButton();
  }, [renderButton]);

  useEffect(() => {
    if (!gsiReady || !containerRef.current) return;

    const observer = new ResizeObserver(() => {
      renderButton();
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [gsiReady, renderButton]);

  return (
    <div className="w-full">
      <div className="relative w-full">
        <div
          className="w-full h-12.5 rounded-xl border border-border bg-white text-[#1f1f1f] text-sm font-medium flex items-center justify-center gap-2.5"
          aria-label={isLoading ? t("common:auth.signing_in_google") : t("common:auth.sign_in_google")}
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.25-.95 2.31-2.01 3.02l3.25 2.52c1.9-1.75 2.99-4.33 2.99-7.4 0-.71-.06-1.39-.18-2.05H12z" />
              <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.45l-3.25-2.52c-.9.6-2.05.96-3.36.96-2.58 0-4.76-1.74-5.55-4.08l-3.35 2.58C4.74 19.94 8.08 22 12 22z" />
              <path fill="#4A90E2" d="M6.45 13.91a5.98 5.98 0 010-3.82L3.1 7.51a9.98 9.98 0 000 8.98l3.35-2.58z" />
              <path fill="#FBBC05" d="M12 6.01c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.95 2.98 14.7 2 12 2 8.08 2 4.74 4.06 3.1 7.51l3.35 2.58c.79-2.34 2.97-4.08 5.55-4.08z" />
            </svg>
          )}
          <span>{t("common:auth.sign_in_google")}</span>
        </div>

        <div
          className={`absolute inset-0 ${!gsiReady || isLoading ? "pointer-events-none" : ""} opacity-0`}
          aria-hidden="true"
        >
          <div ref={containerRef} id="google-signin-button" className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};
