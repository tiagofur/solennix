import React from "react";
import { Clock, AlertCircle } from "lucide-react";

export const PublicFormExpired: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center">
          <Clock className="h-8 w-8 text-warning" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text tracking-tight">
            Enlace no disponible
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            Este enlace ya fue utilizado o ha expirado. Contacta al organizador
            para solicitar uno nuevo.
          </p>
        </div>

        <div className="bg-surface-alt rounded-xl border border-border p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-text-tertiary shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary text-left">
            Los enlaces de formulario son de un solo uso y tienen una fecha de
            expiración para proteger tu seguridad.
          </p>
        </div>
      </div>
    </div>
  );
};
