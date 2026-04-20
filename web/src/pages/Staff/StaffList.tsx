import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  UserCog,
  Eye,
  Users,
} from "lucide-react";
import { RowActionMenu } from "@/components/RowActionMenu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import Empty from "@/components/Empty";
import { Pagination } from "@/components/Pagination";
import { SkeletonTable } from "@/components/Skeleton";
import {
  useStaff,
  useStaffPaginated,
  useDeleteStaff,
} from "@/hooks/queries/useStaffQueries";

const ITEMS_PER_PAGE = 10;

export const StaffList: React.FC = () => {
  const deleteStaff = useDeleteStaff();
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const isSearching = searchTerm.trim().length > 0;

  const paginatedQuery = useStaffPaginated({ page, limit: ITEMS_PER_PAGE, sort: "name", order: "asc" });
  const allStaffQuery = useStaff();

  const loading = isSearching ? allStaffQuery.isLoading : paginatedQuery.isLoading;
  const allStaff = allStaffQuery.data ?? [];

  const filteredStaff = useMemo(() => {
    if (!isSearching) return [];
    const term = searchTerm.toLowerCase();
    return allStaff.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.role_label ?? "").toLowerCase().includes(term) ||
        (s.email ?? "").toLowerCase().includes(term) ||
        (s.phone ?? "").includes(searchTerm),
    );
  }, [allStaff, searchTerm, isSearching]);

  const searchPage = Math.min(page, Math.max(1, Math.ceil(filteredStaff.length / ITEMS_PER_PAGE)));
  const searchPaginated = useMemo(
    () => filteredStaff.slice((searchPage - 1) * ITEMS_PER_PAGE, searchPage * ITEMS_PER_PAGE),
    [filteredStaff, searchPage],
  );

  const rows = isSearching ? searchPaginated : paginatedQuery.data?.data ?? [];
  const currentPage = isSearching ? searchPage : paginatedQuery.data?.page ?? page;
  const totalPages = isSearching
    ? Math.max(1, Math.ceil(filteredStaff.length / ITEMS_PER_PAGE))
    : paginatedQuery.data?.total_pages ?? 1;
  const totalItems = isSearching ? filteredStaff.length : paginatedQuery.data?.total ?? 0;
  const hasAny = isSearching ? allStaff.length > 0 : (paginatedQuery.data?.total ?? 0) > 0 || rows.length > 0;

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };
  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setConfirmOpen(false);
    setPendingDeleteId(null);
    deleteStaff.mutate(id);
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar colaborador"
        description="Se eliminará del catálogo y de los eventos donde esté asignado. Esta acción no se puede deshacer."
        confirmText="Eliminar permanentemente"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Personal</h1>
          <p className="text-sm text-text-secondary mt-1">
            Tu agenda de colaboradores: fotógrafos, DJs, meseros, coordinadores.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/staff/teams"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl text-text bg-surface-alt hover:bg-card border border-border transition-colors"
          >
            <Users className="h-4 w-4 mr-2" aria-hidden="true" />
            Equipos
          </Link>
          <Link
            to="/staff/new"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
            Nuevo colaborador
          </Link>
        </div>
      </div>

      <div className="relative max-w-md">
        <label htmlFor="staff-search" className="sr-only">
          Buscar personal
        </label>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-text-secondary" aria-hidden="true" />
        </div>
        <input
          id="staff-search"
          type="search"
          className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl leading-5 bg-card text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary sm:text-sm"
          placeholder="Buscar por nombre, rol, email o teléfono..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="bg-card shadow-sm overflow-hidden rounded-2xl border border-border">
        {loading ? (
          <SkeletonTable rows={5} columns={[{ width: "w-48" }, { width: "w-36" }, { width: "w-32" }, { width: "w-20" }]} />
        ) : rows.length === 0 ? (
          <Empty
            icon={UserCog}
            title="Sin colaboradores todavía"
            description={
              searchTerm
                ? "No hay colaboradores que coincidan. Probá con otro término."
                : "Agregá fotógrafos, DJs, meseros, coordinadores y asignalos a tus eventos."
            }
            action={
              !searchTerm ? (
                <Link
                  to="/staff/new"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
                  Agregar colaborador
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border" aria-label="Tabla de colaboradores">
              <caption className="sr-only">
                {totalItems} colaboradores, página {currentPage} de {totalPages}.
              </caption>
              <thead className="bg-surface-alt">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary">
                    Nombre
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary">
                    Rol
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary">
                    Contacto
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {rows.map((s) => (
                  <tr
                    key={s.id}
                    className="group hover:bg-surface-alt/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/staff/${s.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold" aria-hidden="true">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4 text-sm font-semibold text-text">{s.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {s.role_label ?? "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {s.phone && (
                        <div className="text-sm flex items-center">
                          <Phone className="h-4 w-4 mr-1 text-text-secondary" aria-hidden="true" />
                          <a
                            href={`tel:${s.phone}`}
                            className="text-primary hover:text-primary-dark transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {s.phone}
                          </a>
                        </div>
                      )}
                      {s.email && (
                        <div className="text-sm flex items-center mt-1">
                          <Mail className="h-4 w-4 mr-1 text-text-secondary" aria-hidden="true" />
                          <a
                            href={`mailto:${s.email}`}
                            className="text-primary hover:text-primary-dark transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {s.email}
                          </a>
                        </div>
                      )}
                      {!s.phone && !s.email && <span className="text-sm text-text-secondary">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <RowActionMenu
                          items={[
                            { label: "Ver detalle", icon: Eye, onClick: () => navigate(`/staff/${s.id}`) },
                            { label: "Editar", icon: Edit, onClick: () => navigate(`/staff/${s.id}/edit`) },
                            { label: "Eliminar", icon: Trash2, onClick: () => requestDelete(s.id), variant: "destructive" as const },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && rows.length > 0 && hasAny && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
};
