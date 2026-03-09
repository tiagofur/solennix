import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-alt flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-xs p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center" aria-hidden="true">
          <AlertTriangle className="w-6 h-6 text-primary" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-text">Página no encontrada</h1>
        <p className="mt-2 text-text-secondary">
          La URL que intentas abrir no existe o fue movida.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-card text-text border border-border hover:bg-surface-alt transition-colors"
            aria-label="Ir a la página de inicio"
          >
            Ir al inicio
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg premium-gradient text-white hover:opacity-90 transition-opacity"
            aria-label="Ir al panel de control"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

