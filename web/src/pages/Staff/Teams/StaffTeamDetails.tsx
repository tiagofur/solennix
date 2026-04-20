import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Crown, Edit, Mail, Phone, Trash2, UserCog, Users } from "lucide-react";
import {
  useDeleteStaffTeam,
  useStaffTeam,
} from "@/hooks/queries/useStaffQueries";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const StaffTeamDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: team, isLoading } = useStaffTeam(id);
  const deleteMut = useDeleteStaffTeam();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) return <div className="text-text-secondary">Cargando…</div>;
  if (!team) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-text-secondary">
        Equipo no encontrado.{" "}
        <Link to="/staff/teams" className="text-primary hover:underline">
          Volver al listado
        </Link>
        .
      </div>
    );
  }

  const members = [...(team.members ?? [])].sort((a, b) => a.position - b.position);

  const onDelete = async () => {
    setConfirmOpen(false);
    await deleteMut.mutateAsync(team.id);
    navigate("/staff/teams");
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar equipo"
        description={`${team.name} se eliminará. Los colaboradores del equipo siguen en tu catálogo.`}
        confirmText="Eliminar permanentemente"
        cancelText="Cancelar"
        onConfirm={onDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <Link
        to="/staff/teams"
        className="inline-flex items-center text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" /> Volver a Equipos
      </Link>

      <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
              <Users className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text tracking-tight">{team.name}</h1>
              {team.role_label && (
                <div className="text-sm text-text-secondary flex items-center gap-1 mt-1">
                  <UserCog className="h-4 w-4" aria-hidden="true" />
                  {team.role_label}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/staff/teams/${team.id}/edit`}
              className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-xl text-text bg-surface-alt hover:bg-card border border-border transition-colors"
            >
              <Edit className="h-4 w-4 mr-2" aria-hidden="true" /> Editar
            </Link>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-xl text-danger bg-danger/10 hover:bg-danger/20 border border-danger/20 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" /> Eliminar
            </button>
          </div>
        </div>

        {team.notes && (
          <div className="mt-6">
            <dt className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Notas</dt>
            <dd className="mt-1 text-sm text-text whitespace-pre-wrap">{team.notes}</dd>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-text">Miembros</h2>
          <span className="ml-2 text-xs text-text-secondary">({members.length})</span>
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Este equipo no tiene miembros todavía. Editalo para agregarlos.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.staff_id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0 flex items-start gap-3">
                  <div
                    className="h-9 w-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0"
                    aria-hidden="true"
                  >
                    {(m.staff_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-text truncate">
                        {m.staff_name ?? "Colaborador"}
                      </span>
                      {m.is_lead && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary"
                          title="Lidera el equipo"
                        >
                          <Crown className="h-3 w-3" aria-hidden="true" />
                          Lidera el equipo
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      {m.staff_role_label && <span>{m.staff_role_label}</span>}
                      {m.staff_phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" aria-hidden="true" />
                          {m.staff_phone}
                        </span>
                      )}
                      {m.staff_email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" aria-hidden="true" />
                          {m.staff_email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  to={`/staff/${m.staff_id}`}
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  Ver perfil
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
