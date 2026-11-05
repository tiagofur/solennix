import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import {
  useStaffMember,
  useCreateStaff,
  useUpdateStaff,
  useStaffLimits,
} from "@/hooks/queries/useStaffQueries";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "react-i18next";
import type { StaffInsert } from "@/types/entities";

const emptyForm: StaffInsert = {
  name: "",
  role_label: "",
  phone: "",
  email: "",
  notes: "",
  notification_email_opt_in: false,
};

export const SUGGESTED_STAFF_ROLES = ["Mesero", "Capitán", "Coordinador", "DJ", "Fotógrafo", "Cocina"] as const;
const ROLE_OTHER = "__other";

export const StaffForm: React.FC = () => {
  const { t } = useTranslation(["staff"]);
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  const { data: existing, isLoading } = useStaffMember(isEdit ? id : undefined);
  const { data: limits } = useStaffLimits();
  const createMut = useCreateStaff();
  const updateMut = useUpdateStaff();

  const isAtLimit = Boolean(!isEdit && limits && !limits.unlimited && limits.max !== null && limits.used >= limits.max);

  const [form, setForm] = useState<StaffInsert>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customRoleOpen, setCustomRoleOpen] = useState(false);

  const roleSelectValue = !form.role_label
    ? ""
    : (SUGGESTED_STAFF_ROLES as readonly string[]).includes(form.role_label)
      ? form.role_label
      : ROLE_OTHER;
  const showCustomRoleInput = customRoleOpen || roleSelectValue === ROLE_OTHER;

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        role_label: existing.role_label ?? "",
        phone: existing.phone ?? "",
        email: existing.email ?? "",
        notes: existing.notes ?? "",
        notification_email_opt_in: existing.notification_email_opt_in,
      });
    }
  }, [existing]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = t("staff:form.errors.name_required");
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      next.email = t("staff:form.errors.email_invalid");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Normalize empty strings to null so the backend treats them as unset.
    const payload: StaffInsert = {
      name: form.name.trim(),
      role_label: form.role_label?.trim() || null,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      notes: form.notes?.trim() || null,
      notification_email_opt_in: form.notification_email_opt_in,
    };

    try {
      if (isEdit && id) {
        await updateMut.mutateAsync({ id, data: payload });
        addToast(t("staff:form.messages.updated"), "success");
      } else {
        await createMut.mutateAsync(payload);
        addToast(t("staff:form.messages.created"), "success");
      }
      navigate("/staff");
    } catch {
      // Toast shown by mutation onError
    }
  };

  if (isEdit && isLoading) {
    return <div className="text-text-secondary">{t("staff:form.loading")}</div>;
  }

  if (isAtLimit) {
    return (
      <div className="max-w-2xl space-y-6">
        <Link to="/staff" className="inline-flex items-center text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" /> {t("staff:form.back")}
        </Link>
        <UpgradeBanner
          type="limit-reached"
          resource="staff"
          currentUsage={limits?.used ?? 1}
          limit={limits?.max ?? 1}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link to="/staff" className="inline-flex items-center text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" /> {t("staff:form.back")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-text tracking-tight">
          {isEdit ? t("staff:form.title_edit") : t("staff:form.title_new")}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {t("staff:form.help_text")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-5">
        <div>
          <label htmlFor="staff-name" className="block text-sm font-medium text-text">
            {t("staff:form.fields.name")} <span className="text-danger">*</span>
          </label>
          <input
            id="staff-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 block w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            placeholder={t("staff:form.fields.name_placeholder")}
            required
          />
          {errors.name && <p className="mt-1 text-sm text-danger">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="staff-role" className="block text-sm font-medium text-text">
            {t("staff:form.fields.role")}
          </label>
          <select
            id="staff-role"
            value={roleSelectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === ROLE_OTHER) {
                setCustomRoleOpen(true);
                setForm({ ...form, role_label: "" });
              } else {
                setCustomRoleOpen(false);
                setForm({ ...form, role_label: v });
              }
            }}
            className="mt-1 block w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          >
            <option value="">{t("staff:form.fields.role_placeholder")}</option>
            {SUGGESTED_STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value={ROLE_OTHER}>{t("staff:form.fields.role_other")}</option>
          </select>
          {showCustomRoleInput && (
            <input
              id="staff-role-custom"
              type="text"
              value={form.role_label ?? ""}
              onChange={(e) => setForm({ ...form, role_label: e.target.value })}
              className="mt-2 block w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              placeholder={t("staff:form.fields.role_custom_placeholder")}
            />
          )}
          <p className="mt-1 text-sm text-text-secondary">{t("staff:form.fields.role_hint")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="staff-phone" className="block text-sm font-medium text-text">
              {t("staff:form.fields.phone")}
            </label>
            <input
              id="staff-phone"
              type="tel"
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 block w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              placeholder={t("staff:form.fields.phone_placeholder")}
            />
          </div>
          <div>
            <label htmlFor="staff-email" className="block text-sm font-medium text-text">
              {t("staff:form.fields.email")}
            </label>
            <input
              id="staff-email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 block w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              placeholder={t("staff:form.fields.email_placeholder")}
            />
            {errors.email && <p className="mt-1 text-sm text-danger">{errors.email}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="staff-notes" className="block text-sm font-medium text-text">
            {t("staff:form.fields.notes")}
          </label>
          <textarea
            id="staff-notes"
            rows={3}
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="mt-1 block w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            placeholder={t("staff:form.fields.notes_placeholder")}
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.notification_email_opt_in}
            onChange={(e) => setForm({ ...form, notification_email_opt_in: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-text-secondary">
            <span className="font-medium text-text">{t("staff:form.fields.notifications")}</span>{" "}
            {t("staff:form.fields.notifications_help")}
          </span>
        </label>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/staff"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl text-text-secondary bg-surface-alt hover:bg-card border border-border transition-colors"
          >
            {t("staff:form.actions.cancel")}
          </Link>
          <button
            type="submit"
            disabled={createMut.isPending || updateMut.isPending}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02] disabled:opacity-60"
          >
            <Save className="h-4 w-4 mr-2" aria-hidden="true" />
            {isEdit ? t("staff:form.actions.save") : t("staff:form.actions.create")}
          </button>
        </div>
      </form>
    </div>
  );
};
