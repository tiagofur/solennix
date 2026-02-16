import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Package, TrendingUp, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const Landing: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Calendar className="h-8 w-8 text-brand-orange" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">Eventos</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-md hover:shadow-lg transition-shadow"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-gray-700" />
              )}
            </button>
            <Link
              to="/login"
              className="text-gray-700 dark:text-gray-300 hover:text-brand-orange dark:hover:text-brand-orange font-medium transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              to="/register"
              className="bg-brand-orange hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
            >
              Registrarse
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6">
            Gestiona tus eventos
            <span className="text-brand-orange"> de manera profesional</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
            La plataforma completa para organizar eventos, gestionar clientes, controlar inventario y maximizar tus resultados.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-brand-orange hover:bg-orange-600 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              Comenzar Gratis
            </Link>
            <Link
              to="/login"
              className="bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all border-2 border-gray-200 dark:border-gray-600"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-brand-orange/10 dark:bg-brand-orange/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-brand-orange" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Calendario de Eventos
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Organiza y visualiza todos tus eventos en un calendario intuitivo.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-brand-green/10 dark:bg-brand-green/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-brand-green" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Gestión de Clientes
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Mantén un registro completo de tus clientes y su historial.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-purple-500/10 dark:bg-purple-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Package className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Control de Inventario
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona productos y recursos para tus eventos.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-blue-500/10 dark:bg-blue-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Análisis y Reportes
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Obtén insights sobre tus eventos y toma mejores decisiones.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            © 2026 Eventos. Gestión profesional de eventos.
          </p>
        </footer>
      </main>
    </div>
  );
};
