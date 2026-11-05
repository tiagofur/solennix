import React, { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Edit, Mail, Phone, Send, Share2, Trash2, UserCog } from "lucide-react";
import {
  useStaffMember,
  useDeleteStaff,
  useStaffAvailabilityRange,
  useStaffLimits,
} from "@/hooks/queries/useStaffQueries";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTranslation } from "react-i18next";
import type { AssignmentStatus } from "@/types/entities";
import { staffService, type StaffInviteTargetRole } from "@/services/staffService";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage, logError } from "@/lib/errorHandler";

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

const isPendingInviteStatus = (status?: string | null): boolean => {
  const normalized = (status ?? "").trim().toLowerCase();
  return normalized === "pending" || normalized === "active" || normalized === "invited" || normalized === "sent";
};

export interface InviteShareArgs {
  business?: string | null;
  role?: string | null;
  url: string;
}

type InviteShareT = (key: string, options?: Record<string, unknown>) => string;

// Pre-built share copy: "Te invito a [negocio] como [rol]…" + accept URL.
// Exported for unit tests; falls back to a business-less template when the
// organizer profile has no business name yet.
export const getInviteShareText = (
  t: InviteShareT,
  args: InviteShareArgs,
): { title: string; text: string } => {
  const role = args.role?.trim() || t("staff:details.actions.invite_share_role_default");
  const business = args.business?.trim();
  if (business) {
    return {
      title: t("staff:details.actions.invite_share_title", { business }),
      text: t("staff:details.actions.invite_share_text", { business, role, url: args.url }),
    };
  }
  return {
    title: t("staff:details.actions.invite_share_title_generic"),
    text: t("staff:details.actions.invite_share_text_generic", { role, url: args.url }),
  };
};

export const StaffDetails: React.FC = () => {
  const { t, i18n } = useTranslation(["staff"]);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { data: staff, isLoading, refetch } = useStaffMember(id);
  const deleteMut = useDeleteStaff();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [revokeOpen, setRevokeOpen] = React.useState(false);
  const [inviteURL, setInviteURL] = React.useState<string | null>(null);
  const [inviting, setInviting] = React.useState(false);
  const [targetRole, setTargetRole] = React.useState<StaffInviteTargetRole>("team_member");
  const hasPendingInvite = Boolean(inviteURL || isPendingInviteStatus(staff?.invite_status));
  // S1: el rol Secretario solo existe en plan Business (el backend responde 403 en otro caso).
  const { data: staffLimits } = useStaffLimits();
  const canInviteAssistant = staffLimits?.plan === "business";

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

  const onInviteAccess = async () => {
    if (!staff?.email || inviting || hasPendingInvite) return;
    setInviting(true);
    try {
      const result = await staffService.inviteUser(staff.id, targetRole);
      setInviteURL(result.accept_url);
      addToast(t("staff:details.actions.invite_sent"), "success");
      try {
        await refetch();
      } catch (refetchError) {
        logError("Error refreshing staff after invite", refetchError);
      }
    } catch (error) {
      logError("Error creating staff invite", error);
      addToast(
        getErrorMessage(error, t("staff:details.actions.invite_error")),
        "error",
      );
    } finally {
      setInviting(false);
    }
  };

  const onRevokeInvite = async () => {
    if (!staff || !hasPendingInvite) return;
    setRevokeOpen(false);
    try {
      await staffService.revokeInvite(staff.id);
      setInviteURL(null);
      await refetch();
      addToast(t("staff:details.actions.invite_revoked"), "info");
    } catch (error) {
      logError("Error revoking staff invite", error);
      addToast(
        getErrorMessage(error, t("staff:details.actions.invite_revoke_error")),
        "error",
      );
    }
  };

  const onCopyInviteURL = async (value?: string) => {
    const textToCopy = value ?? inviteURL;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      addToast(t("staff:details.actions.invite_copied"), "success");
    } catch {
      addToast(textToCopy, "info");
    }
  };

  const onShareInviteURL = async () => {
    if (!inviteURL) return;
    const { title, text } = getInviteShareText(t, {
      business: user?.business_name,
      role: staff?.role_label,
      url: inviteURL,
    });
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: inviteURL });
        return;
      } catch {
        // Share failed or was dismissed — fall through to clipboard copy.
      }
    }
    await onCopyInviteURL(text);
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

      <ConfirmDialog
        open={revokeOpen}
        title={t("staff:details.revoke_confirm.title")}
        description={t("staff:details.revoke_confirm.description")}
        confirmText={t("staff:details.revoke_confirm.confirm")}
        cancelText={t("staff:details.revoke_confirm.cancel")}
        onConfirm={onRevokeInvite}
        onCancel={() => setRevokeOpen(false)}
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
            {staff.email && !staff.invited_user_id && !hasPendingInvite && canInviteAssistant && (
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <span>{t("staff:details.actions.invite_role_label")}</span>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as StaffInviteTargetRole)}
                  disabled={inviting}
                  className="rounded-xl border border-border bg-surface-alt px-2 py-2 text-sm font-medium text-text disabled:opacity-60"
                >
                  <option value="team_member">{t("staff:details.actions.invite_role_member")}</option>
                  <option value="assistant">{t("staff:details.actions.invite_role_assistant")}</option>
                </select>
              </label>
            )}
            {staff.email && !staff.invited_user_id && !hasPendingInvite && (
              <button
                type="button"
                onClick={onInviteAccess}
                disabled={inviting}
                className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-xl text-white premium-gradient disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                {inviting
                  ? t("staff:details.actions.inviting")
                  : t("staff:details.actions.invite")}
              </button>
            )}
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

        {hasPendingInvite && (
          <div className="mt-4 rounded-xl border border-border bg-surface-alt p-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
              {t("staff:details.actions.invite_link")}
            </p>
            <div className="flex flex-col gap-3">
              {inviteURL ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <code className="flex-1 text-xs text-text break-all">{inviteURL}</code>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onShareInviteURL}
                      className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg text-white premium-gradient transition-opacity hover:opacity-90"
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                      {t("staff:details.actions.share_link")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onCopyInviteURL()}
                      className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg text-text bg-card border border-border hover:bg-surface-alt transition-colors"
                    >
                      {t("staff:details.actions.copy_link")}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">
                  {t("staff:details.actions.invite_pending")}
                </p>
              )}
              <p className="text-xs text-text-secondary">
                {t("staff:details.actions.invite_pending_hint")}
              </p>
              <button
                type="button"
                onClick={() => setRevokeOpen(true)}
                className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg text-danger bg-danger/10 border border-danger/20 hover:bg-danger/20 transition-colors self-start"
              >
                {t("staff:details.actions.revoke_invite")}
              </button>
            </div>
          </div>
        )}

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
