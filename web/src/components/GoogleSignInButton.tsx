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

    const initializeGsi = () => {
      if (typeof google === "undefined" || !google.accounts?.id) {
        const timer = setTimeout(initializeGsi, 200);
        return () => clearTimeout(timer);
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
      <div className="w-full">
        <div
          className="w-full rounded-xl overflow-hidden border border-border min-h-12.5"
          aria-label={t("common:auth.sign_in_google")}
        >
          <div ref={containerRef} id="google-signin-button" className="w-full min-h-12.5"></div>
        </div>
      </div>
      {isLoading && (
        <div className="flex items-center justify-center mt-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};
