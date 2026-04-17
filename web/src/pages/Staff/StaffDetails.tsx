import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit, Mail, Phone, Trash2, UserCog } from "lucide-react";
import { useStaffMember, useDeleteStaff } from "@/hooks/queries/useStaffQueries";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const StaffDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: staff, isLoading } = useStaffMember(id);
  const deleteMut = useDeleteStaff();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (isLoading) return <div className="text-text-secondary">Cargando…</div>;
  if (!staff) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-text-secondary">
        Colaborador no encontrado.{" "}
        <Link to="/staff" className="text-primary hover:underline">
          Volver al listado
        </Link>
        .
      </div>
    );
  }

  const onDelete = async () => {
    setConfirmOpen(false);
    await deleteMut.mutateAsync(staff.id);
    navigate("/staff");
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar colaborador"
        description={`${staff.name} se eliminará del catálogo y de los eventos donde esté asignado.`}
        confirmText="Eliminar permanentemente"
        cancelText="Cancelar"
        onConfirm={onDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <Link to="/staff" className="inline-flex items-center text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Personal
      </Link>

      <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary text-xl font-bold">
              {staff.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text tracking-tight">{staff.name}</h1>
              {staff.role_label && (
                <div className="text-sm text-text-secondary flex items-center gap-1 mt-1">
                  <UserCog className="h-4 w-4" aria-hidden="true" />
                  {staff.role_label}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/staff/${staff.id}/edit`}
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

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
          <div>
            <dt className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Teléfono</dt>
            <dd className="mt-1 text-sm text-text">
              {staff.phone ? (
                <a href={`tel:${staff.phone}`} className="text-primary hover:underline flex items-center gap-1">
                  <Phone className="h-4 w-4" aria-hidden="true" /> {staff.phone}
                </a>
              ) : (
                <span className="text-text-secondary">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Email</dt>
            <dd className="mt-1 text-sm text-text">
              {staff.email ? (
                <a href={`mailto:${staff.email}`} className="text-primary hover:underline flex items-center gap-1">
                  <Mail className="h-4 w-4" aria-hidden="true" /> {staff.email}
                </a>
              ) : (
                <span className="text-text-secondary">—</span>
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Notas</dt>
            <dd className="mt-1 text-sm text-text whitespace-pre-wrap">
              {staff.notes || <span className="text-text-secondary">—</span>}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              Notificaciones por email
            </dt>
            <dd className="mt-1 text-sm text-text">
              {staff.notification_email_opt_in
                ? "Aceptado · se activará al liberar la feature (Pro+)."
                : "No aceptado."}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};
