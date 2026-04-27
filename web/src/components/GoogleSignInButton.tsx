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

  const handleCredentialResponse = useCallback(async (
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
  }, [checkAuth, navigate, onError]);

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
  }, [handleCredentialResponse]);

  const renderButton = useCallback(() => {
    if (!gsiReady) return;
    
    const container = document.getElementById("google-signin-button");
    if (container) {
      google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        width: "100%",
        text: "signin_with",
        shape: "rectangular",
      });
    }
  }, [gsiReady]);

  useEffect(() => {
    renderButton();
  }, [renderButton]);

  return (
    <div className="w-full">
      <div id="google-signin-button" className="w-full min-h-[44px]"></div>
      {isLoading && (
        <div className="flex items-center justify-center mt-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};
