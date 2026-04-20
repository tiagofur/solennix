import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Eye, Plus, Trash2, Users } from "lucide-react";
import { RowActionMenu } from "@/components/RowActionMenu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import Empty from "@/components/Empty";
import { SkeletonTable } from "@/components/Skeleton";
import {
  useDeleteStaffTeam,
  useStaffTeams,
} from "@/hooks/queries/useStaffQueries";

export const StaffTeamList: React.FC = () => {
  const navigate = useNavigate();
  const { data: teams = [], isLoading } = useStaffTeams();
  const deleteTeam = useDeleteStaffTeam();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };
  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setConfirmOpen(false);
    setPendingDeleteId(null);
    deleteTeam.mutate(id);
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar equipo"
        description="El equipo se eliminará. Los colaboradores del equipo siguen disponibles en tu catálogo."
        confirmText="Eliminar permanentemente"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />

      <Link
        to="/staff"
        className="inline-flex items-center text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" /> Volver a Personal
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Equipos</h1>
          <p className="text-sm text-text-secondary mt-1">
            Agrupá cuadrillas de colaboradores para asignarlas a un evento en un solo paso.
          </p>
        </div>
        <Link
          to="/staff/teams/new"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02]"
        >
          <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
          Crear equipo
        </Link>
      </div>

      <div className="bg-card shadow-sm overflow-hidden rounded-2xl border border-border">
        {isLoading ? (
          <SkeletonTable
            rows={4}
            columns={[{ width: "w-48" }, { width: "w-36" }, { width: "w-24" }, { width: "w-20" }]}
          />
        ) : teams.length === 0 ? (
          <Empty
            icon={Users}
            title="Sin equipos todavía"
            description="Agregá tu primera cuadrilla. Juntá fotógrafos, meseros o coordinadores y asignalos a un evento en un solo click."
            action={
              <Link
                to="/staff/teams/new"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg transition-all hover:scale-[1.02]"
              >
                <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
                Crear equipo
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border" aria-label="Tabla de equipos">
              <caption className="sr-only">{teams.length} equipos</caption>
              <thead className="bg-surface-alt">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary">
                    Nombre
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary">
                    Rol
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary">
                    Miembros
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {teams.map((t) => (
                  <tr
                    key={t.id}
                    className="group hover:bg-surface-alt/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/staff/teams/${t.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold"
                          aria-hidden="true"
                        >
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="ml-4 text-sm font-semibold text-text">{t.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {t.role_label ?? "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent dark:bg-accent/20">
                        {t.member_count ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <RowActionMenu
                          items={[
                            {
                              label: "Ver detalle",
                              icon: Eye,
                              onClick: () => navigate(`/staff/teams/${t.id}`),
                            },
                            {
                              label: "Editar",
                              icon: Edit,
                              onClick: () => navigate(`/staff/teams/${t.id}/edit`),
                            },
                            {
                              label: "Eliminar",
                              icon: Trash2,
                              onClick: () => requestDelete(t.id),
                              variant: "destructive" as const,
                            },
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
      </div>
    </div>
  );
};
