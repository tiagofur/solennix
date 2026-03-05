import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Code2, Globe, Mail, FileText, Shield, Heart } from 'lucide-react';

const APP_VERSION = '1.0.0';

export const About: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>

        {/* Logo & Version */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-28 h-28 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center mb-4 shadow-lg">
            <Code2 className="h-14 w-14 text-brand-orange" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">EventosApp</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Version {APP_VERSION}
          </p>
        </div>

        {/* Developer info */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Desarrollado por
          </h2>
          <p className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Creapolis.Dev
          </p>

          <div className="border-t border-gray-100 dark:border-gray-700 my-4" />

          <a
            href="https://www.creapolis.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 py-2 text-brand-orange hover:underline"
          >
            <Globe className="h-5 w-5" />
            <span className="text-sm font-medium">www.creapolis.dev</span>
          </a>

          <a
            href="mailto:creapolis.mx@gmail.com"
            className="flex items-center gap-3 py-2 text-brand-orange hover:underline"
          >
            <Mail className="h-5 w-5" />
            <span className="text-sm font-medium">creapolis.mx@gmail.com</span>
          </a>
        </div>

        {/* Legal */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Legal
          </h2>

          <Link
            to="/terms"
            className="flex items-center gap-3 py-2 text-brand-orange hover:underline"
          >
            <FileText className="h-5 w-5" />
            <span className="text-sm font-medium">Terminos y Condiciones</span>
          </Link>

          <Link
            to="/privacy"
            className="flex items-center gap-3 py-2 text-brand-orange hover:underline"
          >
            <Shield className="h-5 w-5" />
            <span className="text-sm font-medium">Politica de Privacidad</span>
          </Link>
        </div>

        {/* About the app */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Sobre la app
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            EventosApp es una aplicacion SaaS disenada para organizadores de eventos
            de todo tipo. Gestiona clientes, eventos, catalogo de productos,
            inventario, cotizaciones y pagos en un solo lugar.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-10">
          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
            Hecho con <Heart className="h-3 w-3 text-red-500 fill-red-500" /> por el equipo de Creapolis.Dev
          </p>
        </div>
      </div>
    </div>
  );
};
