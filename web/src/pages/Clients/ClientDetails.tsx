import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { enUS, es as esLocale } from "date-fns/locale";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  FileText,
  Calendar,
  Users,
} from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { OptimizedImage } from "@/components/OptimizedImage";
import { StatusDropdown, EventStatus } from "@/components/StatusDropdown";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useClient, useDeleteClient } from "@/hooks/queries/useClientQueries";
import { useEventsByClient } from "@/hooks/queries/useEventQueries";

export const ClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["clients", "common"]);
  const { data: client, isLoading: clientLoading, error: clientError } = useClient(id);
  const { data: events = [] } = useEventsByClient(id);
  const deleteClient = useDeleteClient();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const moneyLocale = i18n.language === "en" ? "en-US" : "es-MX";
  const dateLocale = i18n.language === "en" ? enUS : esLocale;

  const loading = clientLoading;
  const error = clientError ? t("common:error.not_found") : null;

  const handleDeleteClient = () => {
    if (!id) return;
    deleteClient.mutate(id, {
      onSuccess: () => navigate("/clients"),
      onSettled: () => setConfirmDeleteOpen(false),
    });
  };

  if (loading) {
    return (
      <div
        className="flex justify-center items-center h-64 p-8 text-text-secondary"
        role="status"
        aria-live="polite"
      >
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"
          aria-hidden="true"
        ></div>
        {t("common:action.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-error" role="alert">
          {error}
        </p>
        <button
          type="button"
          onClick={() => navigate("/clients")}
          className="mt-4 text-primary hover:underline"
        >
          {t("common:action.back")}
        </button>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center p-8 text-text">{t("common:error.not_found")}</div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: t("clients:title"), href: '/clients' }, { label: client.name }]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => navigate("/clients")}
            className="mr-4 p-2 rounded-full hover:bg-surface-alt text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          {client.photo_url ? (
            <OptimizedImage
              src={client.photo_url}
              alt={client.name}
              className="h-10 w-10 rounded-full object-cover"
              placeholderClassName="h-10 w-10 rounded-full mr-3"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold mr-3"
              aria-hidden="true"
            >
              {client.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {client.name}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            to={`/clients/${client.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-border rounded-xl shadow-sm text-sm font-medium text-text-secondary bg-card hover:bg-surface-alt transition-colors"
          >
            <Edit className="h-5 w-5 mr-2" aria-hidden="true" />
            {t("common:action.edit")}
          </Link>
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-error/20 text-sm font-medium rounded-xl text-error bg-error/5 hover:bg-error/10 transition-colors"
          >
            <Trash2 className="h-5 w-5 mr-2" aria-hidden="true" />
            {t("common:action.delete")}
          </button>
        </div>
      </div>

      <div className="bg-card shadow-sm overflow-hidden rounded-2xl border border-border">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-semibold text-text">
            {t("clients:form.personal_info")}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            {t("clients:details.contact_info")}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border border-t border-border">
          <div className="px-4 py-4 text-center">
            <p className="text-2xl font-black text-text">
              {client.total_events ?? 0}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">{t("clients:table.events")}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-2xl font-black text-text">
              $
              {(client.total_spent ?? 0).toLocaleString(moneyLocale, {
                minimumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">{t("clients:details.total_spent")}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-2xl font-black text-text">
              {client.total_events
                ? `$${Math.round((client.total_spent ?? 0) / client.total_events).toLocaleString(moneyLocale)}`
                : "—"}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {t("clients:details.avg_per_event")}
            </p>
          </div>
        </div>
        <div className="border-t border-border px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-text-secondary flex items-center">
                <Phone className="h-4 w-4 mr-2" aria-hidden="true" /> {t("clients:form.phone")}
              </dt>
              <dd className="mt-1 text-sm">
                {client.phone ? (
                  <a
                    href={`tel:${client.phone}`}
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    {client.phone}
                  </a>
                ) : (
                  <span className="text-text">{t("clients:details.not_registered")}</span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-text-secondary flex items-center">
                <Mail className="h-4 w-4 mr-2" aria-hidden="true" /> Email
              </dt>
              <dd className="mt-1 text-sm">
                {client.email ? (
                  <a
                    href={`mailto:${client.email}`}
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    {client.email}
                  </a>
                ) : (
                  <span className="text-text">{t("clients:details.not_registered")}</span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-text-secondary flex items-center">
                <MapPin className="h-4 w-4 mr-2" aria-hidden="true" /> {t("clients:form.address")}
              </dt>
              <dd className="mt-1 text-sm text-text">
                {client.address || t("clients:details.not_registered")}
              </dd>
            </div>
            {client.city && (
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-text-secondary flex items-center">
                  <MapPin className="h-4 w-4 mr-2" aria-hidden="true" /> City
                </dt>
                <dd className="mt-1 text-sm text-text">{client.city}</dd>
              </div>
            )}
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-text-secondary flex items-center">
                <DollarSign className="h-4 w-4 mr-2" aria-hidden="true" /> {t("clients:details.total_spent")}
              </dt>
              <dd className="mt-1 text-sm text-text font-semibold">
                $
                {(client.total_spent ?? 0).toLocaleString(moneyLocale, {
                  minimumFractionDigits: 2,
                })}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-text-secondary flex items-center">
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" /> {t("clients:form.notes")}
              </dt>
              <dd className="mt-1 text-sm text-text">
                {client.notes || t("clients:details.no_notes")}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-card shadow-sm overflow-hidden rounded-2xl border border-border">
        <div className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg leading-6 font-semibold text-text">
              {t("clients:details.events_history")}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-text-secondary">
              {t("common:nav.events")}
            </p>
          </div>
          <Link
            to={`/events/new?clientId=${client.id}`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl text-white premium-gradient shadow-sm transition-colors"
          >
            {t("common:action.add")} {t("common:nav.events").slice(0,-1)}
          </Link>
        </div>
        <div className="border-t border-border">
          {events.length === 0 ? (
            <div className="px-4 py-5 sm:p-6 text-center text-text-secondary">
              <Calendar
                className="mx-auto h-12 w-12 text-text-secondary"
                aria-hidden="true"
              />
              <p className="mt-2">
                {t("clients:details.no_events")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="min-w-full divide-y divide-border"
                aria-label={t("clients:details.events_history")}
              >
                <thead className="bg-surface-alt">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-secondary "
                    >
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                        {t("common:calendar")}
                      </span>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-secondary "
                    >
                      Servicio
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-secondary "
                    >
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                        pax
                      </span>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-secondary "
                    >
                      Estado
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-secondary "
                    >
                      <span className="flex items-center gap-1">
                        <DollarSign
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />{" "}
                        Total
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      className="hover:bg-surface-alt/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/events/${event.id}/summary`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {format(
                          new Date(event.event_date + "T12:00:00"),
                          "d MMM yyyy",
                          { locale: dateLocale },
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">
                        <Link
                          to={`/events/${event.id}/summary`}
                          className="hover:underline"
                        >
                          {event.service_type}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {event.num_people} pax
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <StatusDropdown
                          eventId={event.id}
                          currentStatus={event.status as EventStatus}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
                        $
                        {(event.total_amount ?? 0).toLocaleString(moneyLocale, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t("common:action.delete")}
        description={t("clients:delete_confirm")}
        confirmText={t("common:action.delete")}
        cancelText={t("common:action.cancel")}
        onConfirm={handleDeleteClient}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};
