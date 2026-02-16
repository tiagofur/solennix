export {};

        {/* Status Panel */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <Terminal className="h-5 w-5 mr-2" />
              Estado del Sistema
            </h2>
            <button
              onClick={checkConnection}
              className="p-2 text-gray-400 hover:text-brand-orange"
              title="Recargar estado"
            >
              <RefreshCw
                className={`h-5 w-5 ${status.loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {status.loading ? (
            <div className="text-center py-4">Verificando conexión...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border p-4 rounded-md">
                <h3 className="font-medium mb-2">Autenticación</h3>
                <div className="flex items-center">
                  {status.session?.exists ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                  )}
                  <span>
                    {status.session?.exists
                      ? `Logueado como ${status.session.user}`
                      : "No hay sesión activa"}
                  </span>
                </div>
              </div>

              <div className="border p-4 rounded-md">
                <h3 className="font-medium mb-2">Acceso a Tablas (RLS)</h3>
                <div className="space-y-2">
                  {status.tables &&
                    Object.entries(status.tables).map(
                      ([table, info]: [string, any]) => (
                        <div
                          key={table}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="capitalize">{table}</span>
                          {info.success ? (
                            <span className="text-green-600 flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" /> OK
                            </span>
                          ) : (
                            <span
                              className="text-red-600 flex items-center"
                              title={info.error}
                            >
                              <XCircle className="h-4 w-4 mr-1" /> Error
                            </span>
                          )}
                        </div>
                      ),
                    )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Repair Tools */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold flex items-center mb-4">
            <Database className="h-5 w-5 mr-2" />
            Herramientas de Reparación
          </h2>

          <div className="space-y-6">
            {/* 1. Data Ownership Fix */}
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <h3 className="font-medium text-blue-900">
                1. Reparación Rápida (Datos Huérfanos)
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                Intenta esto primero. Reasigna todos los datos existentes a tu
                usuario actual. Útil si ves tablas vacías pero sabes que hay
                datos.
              </p>
              <button
                onClick={handleAutoFix}
                disabled={isFixing}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isFixing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {isFixing ? "Reparando..." : "Ejecutar Reparación Rápida"}
              </button>
              {fixResult && (
                <p
                  className={`mt-2 text-sm ${fixResult.success ? "text-green-600" : "text-red-600"}`}
                >
                  {fixResult.message}
                </p>
              )}
            </div>

            {/* 2. SQL Fix */}
            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <h3 className="font-medium text-yellow-900">
                2. Reparación Completa (Permisos y Estructura)
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                Si lo anterior falla, el problema son los permisos de la base de
                datos (RLS). Debido a seguridad, la aplicación no puede arreglar
                esto por sí sola.
                <br />
                <br />
                <strong>Instrucciones:</strong>
                <ol className="list-decimal ml-5 mt-1">
                  <li>Copia el script de abajo.</li>
                  <li>
                    Ve al{" "}
                    <a
                      href="https://supabase.com/dashboard/project/_/sql"
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-bold"
                    >
                      SQL Editor de Supabase
                    </a>
                    .
                  </li>
                  <li>Pega el script y dale a "Run".</li>
                </ol>
              </p>

              <div className="relative">
                <textarea
                  readOnly
                  value={repairScript}
                  className="w-full h-48 p-2 text-xs font-mono bg-gray-900 text-green-400 rounded border border-gray-700 focus:outline-none"
                />
                <button
                  onClick={handleCopyScript}
                  className="absolute top-2 right-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded border border-white/20 flex items-center backdrop-blur-sm"
                >
                  <ClipboardCopy className="h-3 w-3 mr-1" /> Copiar SQL
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
