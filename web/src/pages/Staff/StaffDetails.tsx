import React, { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Edit, Mail, Phone, Trash2, UserCog } from "lucide-react";
import {
  useStaffMember,
  useDeleteStaff,
  useStaffAvailabilityRange,
} from "@/hooks/queries/useStaffQueries";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTranslation } from "react-i18next";
import type { AssignmentStatus } from "@/types/entities";

const formatShiftRange = (
  start: string | null | undefined,
  end: string | null | undefined,
  locale: string,
  t: any
): string | null => {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const s = start ? fmt(start) : null;
  const e = end ? fmt(end) : null;
  if (s && e) return `${s} – ${e}`;
  if (s) return t("staff:details.upcoming.shift_from", { time: s });
  if (e) return t("staff:details.upcoming.shift_to", { time: e });
  return null;
};

const formatEventDate = (ymd: string, locale: string): string => {
  const [y, m, d] = ymd.split("-").map((n) => Number(n));
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return ymd;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Tailwind palette mapping — stays off the brand gold/navy so badges feel
// semantic rather than decorative.
const STATUS_CLASSES: Record<AssignmentStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  declined: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200",
  cancelled: "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
};

export const StaffDetails: React.FC = () => {
  const { t, i18n } = useTranslation(["staff"]);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: staff, isLoading } = useStaffMember(id);
  const deleteMut = useDeleteStaff();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Próximas asignaciones — ventana rolling de 90 días desde hoy. Usamos la
  // fecha en zona local (no UTC) para que la ventana coincida con lo que el
  // usuario ve en su calendario; toISOString() podría correr un día.
  const { rangeStart, rangeEnd } = useMemo(() => {
    const ymdLocal = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 90);
    return { rangeStart: ymdLocal(today), rangeEnd: ymdLocal(end) };
  }, []);
  const { data: availability = [] } = useStaffAvailabilityRange(
    staff ? rangeStart : null,
    staff ? rangeEnd : null,
  );
  const upcomingAssignments = useMemo(() => {
    if (!staff) return [];
    const entry = availability.find((a) => a.staff_id === staff.id);
    if (!entry) return [];
    return [...entry.assignments].sort((a, b) => a.event_date.localeCompare(b.event_date));
  }, [availability, staff]);

  if (isLoading) return <div className="text-text-secondary">{t("staff:details.loading")}</div>;
  if (!staff) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-text-secondary">
        {t("staff:details.not_found")}{" "}
        <Link to="/staff" className="text-primary hover:underline">
          {t("staff:details.return_list")}
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
        title={t("staff:details.delete_confirm.title")}
        description={t("staff:details.delete_confirm.description", { name: staff.name })}
        confirmText={t("staff:details.delete_confirm.confirm")}
        cancelText={t("staff:details.delete_confirm.cancel")}
        onConfirm={onDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <Link to="/staff" className="inline-flex items-center text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" /> {t("staff:details.back")}
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
              <Edit className="h-4 w-4 mr-2" aria-hidden="true" /> {t("staff:details.actions.edit")}
            </Link>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-xl text-danger bg-danger/10 hover:bg-danger/20 border border-danger/20 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" /> {t("staff:details.actions.delete")}
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
          <div>
            <dt className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{t("staff:details.fields.phone")}</dt>
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
            <dt className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{t("staff:details.fields.email")}</dt>
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
            <dt className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{t("staff:details.fields.notes")}</dt>
            <dd className="mt-1 text-sm text-text whitespace-pre-wrap">
              {staff.notes || <span className="text-text-secondary">—</span>}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              {t("staff:details.fields.notifications")}
            </dt>
            <dd className="mt-1 text-sm text-text">
              {staff.notification_email_opt_in
                ? t("staff:details.fields.notifications_desc")
                : t("staff:details.fields.notifications_off")}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-text">{t("staff:details.upcoming.title")}</h2>
        </div>
        {upcomingAssignments.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {t("staff:details.upcoming.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {upcomingAssignments.map((a) => {
              const shift = formatShiftRange(a.shift_start, a.shift_end, i18n.language, t);
              return (
                <li key={a.event_id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      to={`/events/${a.event_id}/summary`}
                      className="font-medium text-text hover:text-primary hover:underline truncate block"
                    >
                      {a.event_name || "Evento"}
                    </Link>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {formatEventDate(a.event_date, i18n.language)}
                      {shift ? ` · ${shift}` : ""}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_CLASSES[a.status]}`}
                  >
                    {t(`staff:details.status.${a.status}`)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
