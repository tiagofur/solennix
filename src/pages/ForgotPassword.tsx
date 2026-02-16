import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { Mail, AlertCircle, CheckCircle, Moon, Sun, ArrowLeft } from "lucide-react";
import { useTheme } from '../hooks/useTheme';
import { SetupRequired } from '../components/SetupRequired';

const forgotSchema = z.object({
  email: z.string().email("Email inválido"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export const ForgotPassword: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setSuccess("Revisa tu correo para restablecer tu contraseña.");
    } catch (err: any) {
      setError(err.message || "Error al enviar el correo de recuperación");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if Supabase is configured after all hooks
  if (!isSupabaseConfigured()) {
    return <SetupRequired />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="absolute top-4 left-4">
        <Link
          to="/login"
          className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-brand-orange dark:hover:text-brand-orange transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Volver</span>
        </Link>
      </div>
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 text-yellow-500" />
          ) : (
            <Moon className="h-5 w-5 text-gray-700" />
          )}
        </button>
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Recuperar Contraseña
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Ingresa tu email y te enviaremos un enlace.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  id="email"
                  {...register("email")}
                  type="email"
                  className="focus:ring-brand-orange focus:border-brand-orange block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md py-2 border"
                  placeholder="tu@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Enviando..." : "Enviar enlace"}
              </button>
            </div>

            <div className="text-center">
              <Link to="/login" className="text-sm text-brand-orange hover:text-orange-500">
                Volver a iniciar sesión
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
