import React from 'react';
import { AlertTriangle, ExternalLink, FileText } from 'lucide-react';

export const SetupRequired: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-yellow-100 dark:bg-yellow-900 rounded-full p-3">
            <AlertTriangle className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white">
          Configuración Requerida
        </h1>
        
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          La aplicación no puede conectarse a la base de datos porque falta la configuración de Supabase.
        </p>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Pasos para configurar:
          </h2>
          
          <ol className="space-y-4 text-gray-700 dark:text-gray-300">
            <li className="flex">
              <span className="font-bold mr-2">1.</span>
              <div>
                <p className="font-medium">Crea un proyecto en Supabase</p>
                <a 
                  href="https://supabase.com/dashboard" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-brand-orange hover:underline inline-flex items-center mt-1"
                >
                  Ir a Supabase Dashboard <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </div>
            </li>
            
            <li className="flex">
              <span className="font-bold mr-2">2.</span>
              <div>
                <p className="font-medium">Copia las credenciales del proyecto</p>
                <p className="text-sm mt-1">En tu proyecto de Supabase, ve a Settings → API y copia:</p>
                <ul className="list-disc ml-5 mt-2 text-sm">
                  <li>Project URL</li>
                  <li>anon/public key</li>
                </ul>
              </div>
            </li>
            
            <li className="flex">
              <span className="font-bold mr-2">3.</span>
              <div>
                <p className="font-medium">Ejecuta el esquema de base de datos</p>
                <p className="text-sm mt-1">
                  En el SQL Editor de Supabase, ejecuta el archivo:<br />
                  <code className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs">
                    supabase/migrations/20260215000001_consolidated_schema.sql
                  </code>
                </p>
              </div>
            </li>
            
            <li className="flex">
              <span className="font-bold mr-2">4.</span>
              <div>
                <p className="font-medium">Configura las variables de entorno</p>
                <div className="mt-2">
                  <p className="text-sm font-medium mb-2">Para desarrollo local:</p>
                  <div className="bg-gray-800 dark:bg-gray-900 rounded p-3 text-sm font-mono text-white overflow-x-auto">
                    <p className="text-gray-400"># Crea un archivo .env en la raíz del proyecto</p>
                    <p>VITE_SUPABASE_URL=tu_project_url</p>
                    <p>VITE_SUPABASE_ANON_KEY=tu_anon_key</p>
                  </div>
                  
                  <p className="text-sm font-medium mt-4 mb-2">Para Vercel:</p>
                  <p className="text-sm">
                    Agrega las variables de entorno en la configuración del proyecto en Vercel Dashboard
                  </p>
                </div>
              </div>
            </li>
            
            <li className="flex">
              <span className="font-bold mr-2">5.</span>
              <div>
                <p className="font-medium">Reinicia la aplicación</p>
                <p className="text-sm mt-1">
                  Después de configurar las variables, reinicia el servidor de desarrollo o redeploy en Vercel
                </p>
              </div>
            </li>
          </ol>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Nota:</strong> Si la aplicación ya estaba funcionando antes, verifica que las variables de 
            entorno no se hayan perdido. En Vercel, revisa la configuración de Environment Variables del proyecto.
          </p>
        </div>
      </div>
    </div>
  );
};
