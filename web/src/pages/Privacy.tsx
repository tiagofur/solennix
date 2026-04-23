import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const Privacy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>

        <h1 className="text-3xl font-black tracking-tight text-text mb-2">
          Política de Privacidad
        </h1>
        <p className="text-sm text-text-secondary mb-10">
          Última actualización: 23 de abril de 2026
        </p>

        {/* Section 1 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            1. Información que recopilamos
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Recopilamos la información que nos proporcionas al registrarte en Solennix,
            incluyendo tu nombre, correo electrónico y datos de tu negocio. También
            recopilamos información sobre el uso de la aplicación para mejorar
            nuestros servicios y garantizar la seguridad de la plataforma.
          </p>
        </div>

        {/* Section 2 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            2. Cómo usamos tu información
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            Utilizamos tu información para:
          </p>
          <ul className="text-sm text-text-secondary leading-relaxed space-y-1 list-disc list-inside">
            <li>Proporcionar y mejorar los servicios de Solennix</li>
            <li>Gestionar tu cuenta y suscripción</li>
            <li>Enviarte comunicaciones sobre el servicio</li>
            <li>Procesar pagos a través de proveedores seguros</li>
            <li>Cumplir con obligaciones legales y regulatorias</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            3. Almacenamiento y seguridad
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Tus datos se almacenan en servidores seguros con cifrado de nivel industrial. 
            Implementamos medidas técnicas y organizativas apropiadas para proteger tu 
            información contra acceso no autorizado, alteración, divulgación o destrucción.
          </p>
        </div>

        {/* Section 4 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            4. Compartir información
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            No vendemos, intercambiamos ni transferimos tu información personal a
            terceros con fines publicitarios. Compartimos datos únicamente cuando sea 
            estrictamente necesario para proporcionar el servicio (procesadores de pago, 
            proveedores de infraestructura) o cuando lo exija la ley.
          </p>
        </div>

        {/* Section 5 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            5. Tus derechos y eliminación de datos
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            De acuerdo con las leyes de protección de datos, tienes derecho a:
          </p>
          <ul className="text-sm text-text-secondary leading-relaxed space-y-1 list-disc list-inside mb-4">
            <li>Acceder a tu información personal</li>
            <li>Corregir datos inexactos</li>
            <li>Solicitar la eliminación de tu cuenta y todos tus datos asociados</li>
            <li>Oponerte al tratamiento de ciertos datos</li>
            <li>Exportar tu información en un formato estándar</li>
          </ul>
          <p className="text-sm text-text-secondary leading-relaxed">
            Para ejercer tu derecho al borrado, puedes visitar nuestra página dedicada de{' '}
            <Link to="/eliminar-cuenta" className="text-brand-orange font-bold hover:underline">
              Solicitud de Eliminación de Cuenta
            </Link> o contactarnos directamente.
          </p>
        </div>

        {/* Section 6 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            6. Cookies y tecnologías similares
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            La aplicación utiliza almacenamiento local seguro para mantener tu sesión
            iniciada y preferencias. No utilizamos cookies de rastreo con fines publicitarios 
            ni compartimos hábitos de navegación con terceros.
          </p>
        </div>

        {/* Section 7 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            7. Cambios a esta política
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Podemos actualizar esta Política de Privacidad periódicamente para reflejar 
            cambios en el servicio o requisitos legales. Te notificaremos sobre cambios 
            significativos a través de la aplicación o por correo electrónico.
          </p>
        </div>

        {/* Section 8 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            8. Contacto
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Si tienes preguntas sobre esta política o el tratamiento de tus datos, contáctanos:
          </p>
          <p className="text-sm text-text-secondary leading-relaxed mt-2">
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
