import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Mail } from 'lucide-react';

export const AccountDeletion: React.FC = () => {
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
          Eliminación de Cuenta
        </h1>
        <p className="text-sm text-text-secondary mb-10">
          Información sobre el proceso de borrado de datos en Solennix.
        </p>

        <div className="bg-card border border-border rounded-2xl p-8 mb-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">Solicitud de eliminación</h2>
              <p className="text-sm text-text-secondary">Tu privacidad y el control de tus datos son nuestra prioridad.</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
            <p>
              De acuerdo con las políticas de Google Play y Apple App Store, así como con las regulaciones de protección de datos,
              Solennix proporciona a sus usuarios un camino claro para solicitar la eliminación de su cuenta y todos los datos personales asociados.
            </p>

            <div className="bg-bg/50 rounded-xl p-4 border border-border/50">
              <h3 className="font-semibold text-text mb-2">¿Qué sucede al eliminar tu cuenta?</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Se eliminarán permanentemente tus datos de perfil (nombre, email, foto).</li>
                <li>Se borrarán todos tus eventos, clientes, productos e inventario.</li>
                <li>Se cancelará cualquier suscripción activa (aunque te recomendamos hacerlo primero desde tu tienda de aplicaciones).</li>
                <li><strong>Esta acción es irreversible.</strong> Una vez completada, no podremos recuperar tu información.</li>
              </ul>
            </div>

            <h3 className="text-lg font-bold text-text mt-8 mb-2">Cómo solicitar el borrado</h3>
            <p>
              Para iniciar el proceso de eliminación, por favor envía un correo electrónico desde la dirección vinculada a tu cuenta:
            </p>

            <a 
              href="mailto:hola@creapolis.dev?subject=Solicitud de eliminación de cuenta - Solennix"
              className="flex items-center gap-3 w-full p-4 rounded-xl border border-brand-orange/20 bg-brand-orange/5 text-brand-orange font-semibold hover:bg-brand-orange/10 transition-colors"
            >
              <Mail className="h-5 w-5" />
              Enviar solicitud a hola@creapolis.dev
            </a>

            <p className="text-xs italic mt-4">
              * Nuestro equipo procesará tu solicitud en un plazo máximo de 48 a 72 horas hábiles. Recibirás un correo de confirmación una vez que el proceso haya finalizado.
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-3">
            Otras consultas sobre tus datos
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Si solo deseas corregir información o tienes dudas sobre cómo tratamos tus datos, te invitamos a revisar nuestra{' '}
            <button onClick={() => navigate('/privacy')} className="text-brand-orange hover:underline">
              Política de Privacidad
            </button>.
          </p>
        </div>
      </div>
    </div>
  );
};
