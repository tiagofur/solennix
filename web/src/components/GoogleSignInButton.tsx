import React, { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

interface Props {
  onError?: (message: string) => void;
}

export const GoogleSignInButton: React.FC<Props> = ({ onError }) => {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initializeGsi = () => {
      if (typeof google === "undefined" || !google.accounts?.id) {
        const timer = setTimeout(initializeGsi, 200);
        return () => clearTimeout(timer);
      }

      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      setGsiReady(true);
    };

    initializeGsi();
  }, []);

  const handleCredentialResponse = async (
    response: google.accounts.id.CredentialResponse
  ) => {
    setIsLoading(true);
    try {
      await api.post("/auth/google", { id_token: response.credential });
      await checkAuth();
      navigate("/dashboard");
    } catch (err: any) {
      onError?.(err.message || "Error al iniciar sesión con Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = useCallback(() => {
    if (isLoading || !gsiReady) return;

    // Trigger Google One Tap / account chooser prompt
    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap not available — fall back to button flow
        // Create a hidden container, render the GSI button, and click it
        const container = document.createElement("div");
        container.style.display = "none";
        document.body.appendChild(container);

        google.accounts.id.renderButton(container, {
          type: "standard",
          size: "large",
        });

        const btn = container.querySelector<HTMLElement>(
          '[role="button"], iframe'
        );
        if (btn) btn.click();

        setTimeout(() => container.remove(), 100);
      }
    });
  }, [isLoading, gsiReady]);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading || !gsiReady}
        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-border bg-card text-text-primary text-sm font-medium transition-all hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label={
          isLoading ? "Iniciando sesión con Google..." : "Continuar con Google"
        }
      >
        {isLoading ? (
          <svg
            className="animate-spin h-5 w-5 text-text-secondary"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
        ) : (
          <>
            {/* Google "G" logo — official colors */}
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continuar con Google
          </>
        )}
      </button>
    </div>
  );
};
