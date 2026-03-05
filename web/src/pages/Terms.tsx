import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const Terms: React.FC = () => {
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
          Terminos y Condiciones
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">
          Ultima actualizacion: 1 de enero de 2025
        </p>

        {/* Section 1 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            1. Uso del servicio
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            Al usar Solennix, aceptas estos terminos. Solennix es una plataforma
            SaaS para organizadores de eventos. Te otorgamos una licencia limitada,
            no exclusiva y no transferible para usar el servicio segun tu plan de
            suscripcion activo.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
            Te comprometes a:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1 list-disc list-inside">
            <li>Proporcionar informacion veraz al registrarte</li>
            <li>Mantener la confidencialidad de tu cuenta</li>
            <li>No usar el servicio para actividades ilegales</li>
            <li>No intentar acceder a datos de otros usuarios</li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            2. Suscripcion y pagos
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            Solennix ofrece planes de suscripcion mensual. Los cobros se realizan
            a traves de procesadores de pago seguros como Stripe.
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1 list-disc list-inside">
            <li>El plan Basico es gratuito con funcionalidades limitadas</li>
            <li>El plan Pro incluye todas las funcionalidades sin restricciones</li>
            <li>Los precios pueden variar segun tu region</li>
            <li>Las suscripciones se renuevan automaticamente salvo cancelacion</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            3. Cancelacion
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            Puedes cancelar tu suscripcion en cualquier momento desde la configuracion
            de tu cuenta. La cancelacion sera efectiva al final del periodo de facturacion actual.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
            Al cancelar:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1 list-disc list-inside">
            <li>Mantendras acceso hasta el final del periodo pagado</li>
            <li>No se realizan reembolsos proporcionales</li>
            <li>Tus datos se conservan por 30 dias adicionales</li>
            <li>Puedes exportar tus datos antes de eliminar la cuenta</li>
          </ul>
        </div>

        {/* Section 4 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            4. Propiedad intelectual
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Solennix y su contenido son propiedad de Creapolis.Dev. Los datos que
            introduces en la aplicacion (clientes, eventos, productos) son de tu
            propiedad. Nos otorgas una licencia para almacenarlos y procesarlos
            unicamente con el fin de prestarte el servicio.
          </p>
        </div>

        {/* Section 5 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            5. Disponibilidad del servicio
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Nos esforzamos por mantener Solennix disponible 24/7, pero no garantizamos
            disponibilidad ininterrumpida. Podemos realizar mantenimientos programados
            con previo aviso. No somos responsables por interrupciones causadas por
            factores externos.
          </p>
        </div>

        {/* Section 6 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            6. Limitacion de responsabilidad
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            Solennix se proporciona "tal cual". En la maxima medida permitida por
            la ley aplicable:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1 list-disc list-inside">
            <li>No garantizamos que el servicio sea libre de errores</li>
            <li>No somos responsables de perdidas de datos por causas ajenas a nosotros</li>
            <li>Nuestra responsabilidad total no superara el monto pagado en los ultimos 3 meses de servicio</li>
            <li>No somos responsables de danos indirectos o consecuentes</li>
          </ul>
        </div>

        {/* Section 7 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            7. Modificaciones
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Nos reservamos el derecho de modificar estos terminos. Te notificaremos
            con al menos 15 dias de anticipacion sobre cambios materiales.
            El uso continuado del servicio tras los cambios implica aceptacion.
          </p>
        </div>

        {/* Section 8 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            8. Ley aplicable
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Estos terminos se rigen por las leyes de Mexico. Cualquier disputa
            se resolvera en los tribunales competentes de la Ciudad de Mexico.
          </p>
        </div>

        {/* Section 9 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            9. Contacto
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Para cualquier consulta sobre estos terminos:
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
