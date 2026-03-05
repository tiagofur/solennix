import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const Privacy: React.FC = () => {
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

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Politica de Privacidad
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">
          Ultima actualizacion: 1 de enero de 2025
        </p>

        {/* Section 1 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            1. Informacion que recopilamos
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Recopilamos la informacion que nos proporcionas al registrarte en Solennix,
            incluyendo tu nombre, correo electronico y datos de tu negocio. Tambien
            recopilamos informacion sobre el uso de la aplicacion para mejorar
            nuestros servicios.
          </p>
        </div>

        {/* Section 2 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            2. Como usamos tu informacion
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            Utilizamos tu informacion para:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1 list-disc list-inside">
            <li>Proporcionar y mejorar los servicios de Solennix</li>
            <li>Gestionar tu cuenta y suscripcion</li>
            <li>Enviarte comunicaciones sobre el servicio</li>
            <li>Procesar pagos a traves de proveedores seguros</li>
            <li>Cumplir con obligaciones legales</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            3. Almacenamiento y seguridad
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Tus datos se almacenan en servidores seguros. Implementamos medidas tecnicas
            y organizativas apropiadas para proteger tu informacion contra acceso
            no autorizado, alteracion, divulgacion o destruccion.
          </p>
        </div>

        {/* Section 4 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            4. Compartir informacion
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            No vendemos, intercambiamos ni transferimos tu informacion personal a
            terceros sin tu consentimiento, excepto cuando sea necesario para proporcionar
            el servicio (procesadores de pago, proveedores de infraestructura) o cuando
            lo exija la ley.
          </p>
        </div>

        {/* Section 5 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            5. Tus derechos
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            Tienes derecho a:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1 list-disc list-inside">
            <li>Acceder a tu informacion personal</li>
            <li>Corregir datos inexactos</li>
            <li>Solicitar la eliminacion de tu cuenta y datos</li>
            <li>Exportar tus datos</li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-3">
            Para ejercer estos derechos, contactanos en{' '}
            <a href="mailto:hola@creapolis.dev" className="text-brand-orange hover:underline">
              hola@creapolis.dev
            </a>
          </p>
        </div>

        {/* Section 6 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            6. Cookies y tecnologias similares
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            La aplicacion utiliza almacenamiento local seguro para mantener tu sesion
            iniciada y preferencias. No utilizamos cookies de rastreo con fines publicitarios.
          </p>
        </div>

        {/* Section 7 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            7. Cambios a esta politica
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Podemos actualizar esta Politica de Privacidad periodicamente. Te
            notificaremos sobre cambios significativos a traves de la aplicacion
            o por correo electronico.
          </p>
        </div>

        {/* Section 8 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            8. Contacto
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Si tienes preguntas sobre esta politica, contactanos:
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-2">
            Creapolis.Dev<br />
            <a href="mailto:hola@creapolis.dev" className="text-brand-orange hover:underline">
              hola@creapolis.dev
            </a><br />
            <a href="https://www.creapolis.dev" target="_blank" rel="noopener noreferrer" className="text-brand-orange hover:underline">
              https://www.creapolis.dev
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
