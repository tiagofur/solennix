import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clientService } from "../../services/clientService";
import { Client } from "../../types/entities";
import { Plus, Search, Edit, Trash2, Phone, Mail, Download, Users } from "lucide-react";
import { exportToCsv } from "../../lib/exportCsv";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { logError } from "../../lib/errorHandler";
import Empty from "../../components/Empty";
import { useToast } from "../../hooks/useToast";
import { usePagination } from "../../hooks/usePagination";
import { Pagination } from "../../components/Pagination";
import { ArrowUp, ArrowDown } from "lucide-react";
import { SkeletonTable } from "../../components/Skeleton";

export const ClientList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const data = await clientService.getAll();
      setClients(data || []);
    } catch (error) {
      logError("Error fetching clients", error);
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
      addToast("Cliente eliminado correctamente.", "success");
    } catch (error) {
      logError("Error deleting client", error);
      addToast("Error al eliminar el cliente.", "error");
    }
  };

  const filteredClients = (clients || []).filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email &&
        client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      client.phone.includes(searchTerm),
  );

  const {
    currentData: paginatedClients,
    currentPage,
    totalPages,
    totalItems,
    handlePageChange,
    handleSort,
    sortKey,
    sortOrder,
  } = usePagination({
    data: filteredClients,
    itemsPerPage: 8,
    initialSortKey: "name",
    initialSortOrder: "asc",
  });

  const renderSortIcon = (key: keyof Client) => {
    if (sortKey !== key) return null;
    return sortOrder === "asc" ? (
      <ArrowUp className="inline h-3 w-3 ml-1" aria-hidden="true" />
    ) : (
      <ArrowDown className="inline h-3 w-3 ml-1" aria-hidden="true" />
    );
  };

  const getSortAriaSort = (
    key: keyof Client,
  ): "ascending" | "descending" | "none" => {
    if (sortKey !== key) return "none";
    return sortOrder === "asc" ? "ascending" : "descending";
  };

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
        <h1 className="text-2xl font-bold text-text">Clientes</h1>
        <div className="flex items-center gap-2">
          {clients.length > 0 && (
            <button
              type="button"
              onClick={() => exportToCsv(
                'clientes',
                ['Nombre', 'Teléfono', 'Email', 'Dirección', 'Ciudad', 'Eventos', 'Total Gastado', 'Notas'],
                clients.map(c => [c.name, c.phone, c.email, c.address, c.city, c.total_events, c.total_spent?.toFixed(2), c.notes]),
              )}
              className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt shadow-sm transition-colors"
              aria-label="Exportar clientes a CSV"
            >
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              CSV
            </button>
          )}
          <Link
            to="/clients/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-brand-orange hover:bg-orange-600 shadow-sm transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
            Nuevo Cliente
          </Link>
        </div>
      </div>

      <div className="relative max-w-md">
        <label htmlFor="client-search" className="sr-only">
          Buscar clientes
        </label>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-text-secondary" aria-hidden="true" />
        </div>
        <input
          id="client-search"
          type="search"
          className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl leading-5 bg-card text-text placeholder-text-secondary focus:outline-hidden focus:ring-brand-orange focus:border-brand-orange sm:text-sm transition duration-150 ease-in-out"
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Buscar clientes por nombre, email o teléfono"
        />
      </div>

      <div className="bg-card shadow-sm overflow-hidden rounded-3xl border border-border">
        {loading ? (
          <SkeletonTable
            rows={6}
            columns={[
              { width: "w-48", avatar: true },
              { width: "w-36" },
              { width: "w-24", badge: true },
              { width: "w-28" },
              { width: "w-20" },
            ]}
          />
        ) : filteredClients.length === 0 ? (
          <Empty
            icon={Users}
            title="No se encontraron clientes"
            description={
              searchTerm
                ? "Intenta ajustar los términos de búsqueda."
                : "Comienza agregando tu primer cliente."
            }
            action={
              !searchTerm ? (
                <Link
                  to="/clients/new"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-brand-orange hover:bg-orange-600 shadow-sm"
                >
                  <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
                  Agregar Cliente
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table
              className="min-w-full divide-y divide-border"
              aria-label="Tabla de clientes"
            >
              <caption className="sr-only">
                Lista de clientes con {totalItems} resultados. Mostrando página{" "}
                {currentPage} de {totalPages}.
              </caption>
              <thead className="bg-surface-alt">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-alt/50 transition-colors"
                    onClick={() => handleSort("name")}
                    aria-sort={getSortAriaSort("name")}
                  >
                    Cliente {renderSortIcon("name")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                  >
                    Contacto
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-alt/50 transition-colors"
                    onClick={() => handleSort("total_events")}
                    aria-sort={getSortAriaSort("total_events")}
                  >
                    Eventos {renderSortIcon("total_events")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-alt/50 transition-colors"
                    onClick={() => handleSort("total_spent")}
                    aria-sort={getSortAriaSort("total_spent")}
                  >
                    Total Gastado {renderSortIcon("total_spent")}
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {paginatedClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-surface-alt/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {client.photo_url ? (
                          <img
                            src={client.photo_url}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="h-10 w-10 rounded-full bg-brand-green/10 dark:bg-brand-green/20 flex items-center justify-center text-brand-green dark:text-green-400 font-bold"
                            aria-hidden="true"
                          >
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-text">
                            {client.name}
                          </div>
                          <div className="text-text-secondary truncate max-w-[200px]">
                            {client.address}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm flex items-center">
                        <Phone
                          className="h-4 w-4 mr-1 text-text-secondary"
                          aria-hidden="true"
                        />
                        <a
                          href={`tel:${client.phone}`}
                          className="text-brand-orange hover:text-orange-600 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Llamar a ${client.name} al ${client.phone}`}
                        >
                          {client.phone}
                        </a>
                      </div>
                      {client.email && (
                        <div className="text-sm flex items-center mt-1">
                          <Mail
                            className="h-4 w-4 mr-1 text-text-secondary"
                            aria-hidden="true"
                          />
                          <a
                            href={`mailto:${client.email}`}
                            className="text-brand-orange hover:text-orange-600 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Enviar email a ${client.name} a ${client.email}`}
                          >
                            {client.email}
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-brand-green/10 text-brand-green border border-brand-green/20">
                        {client.total_events} eventos
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      ${client.total_spent.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/clients/${client.id}/edit`}
                          className="text-text-secondary hover:text-brand-orange transition-colors mr-3 inline-block"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Editar cliente ${client.name}`}
                        >
                          <Edit className="h-5 w-5" aria-hidden="true" />
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDelete(client.id);
                          }}
                          className="text-text-secondary hover:text-red-500 transition-colors inline-block"
                          aria-label={`Eliminar cliente ${client.name}`}
                        >
                          <Trash2 className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredClients.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={8}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
};
