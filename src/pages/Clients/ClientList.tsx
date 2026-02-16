import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clientService } from '../../services/clientService';
import { Database } from '../../types/supabase';
import { Plus, Search, Edit, Trash2, Phone, Mail } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { logError } from '../../lib/errorHandler';
import Empty from '../../components/Empty';

type Client = Database['public']['Tables']['clients']['Row'];

export const ClientList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const data = await clientService.getAll();
      setClients(data);
    } catch (error) {
      logError('Error fetching clients', error);
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setConfirmOpen(false);
    setPendingDeleteId(null);

    try {
      await clientService.delete(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      logError('Error deleting client', error);
    }
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    client.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar cliente"
        description="Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
        <Link
          to="/clients/new"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-orange hover:bg-orange-600 shadow-sm transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Cliente
        </Link>
      </div>

      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-brand-orange focus:border-brand-orange sm:text-sm transition duration-150 ease-in-out"
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        {loading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">Cargando clientes...</div>
        ) : filteredClients.length === 0 ? (
          <Empty 
            title="No se encontraron clientes" 
            description={searchTerm ? "Intenta ajustar los términos de búsqueda." : "Comienza agregando tu primer cliente."}
            action={
              !searchTerm ? (
                <Link
                  to="/clients/new"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-orange hover:bg-orange-600 shadow-sm"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Agregar Cliente
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Eventos
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total Gastado
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-brand-green/10 dark:bg-brand-green/20 flex items-center justify-center text-brand-green dark:text-green-400 font-bold">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{client.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{client.address}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white flex items-center">
                        <Phone className="h-4 w-4 mr-1 text-gray-400" />
                        {client.phone}
                      </div>
                      {client.email && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                          <Mail className="h-4 w-4 mr-1 text-gray-400" />
                          {client.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        {client.total_events} eventos
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      ${client.total_spent.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/clients/${client.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          title="Editar"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Edit className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDelete(client.id);
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Eliminar"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
