import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-brand-orange" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Página no encontrada</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          La URL que intentas abrir no existe o fue movida.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Ir al inicio
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600 transition-colors"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

