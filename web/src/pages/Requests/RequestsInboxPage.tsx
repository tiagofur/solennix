import React, { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Inbox,
  Loader2,
  CheckCircle,
  MailOpen,
  MessageSquareReply,
  XCircle,
  HelpCircle,
  CalendarPlus,
  Link2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { useToast } from "@/hooks/useToast";
import {
  organizerRequestsService,
  type OrganizerRequestDetail,
  type PublicRequest,
  type PublicRequestStatus,
} from "@/services/organizerRequestsService";
import { RequestLinksPanel } from "./RequestLinksPanel";

const LIST_KEY = ["organizer-requests"];
const UNREAD_KEY = ["organizer-requests", "unread"];
const PAGE_SIZE = 50;
const UNREAD_REFRESH_MS = 30_000;

const STATUS_FILTERS: Array<PublicRequestStatus | ""> = [
  "",
  "pending",
  "info_requested",
  "responded",
  "accepted_by_client",
  "declined_provider",
  "declined_client",
  "booked",
  "expired",
];

type HubTab = "inbox" | "links";

export const RequestsInboxPage: React.FC = () => {
  const { t, i18n } = useTranslation(["requests", "common"]);
  const queryClient = useQueryClient();
  const addToast = useToast((s) => s.addToast);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: HubTab =
    searchParams.get("tab") === "links" ? "links" : "inbox";

  const setTab = (tab: HubTab) => {
    if (tab === "links") {
      setSearchParams({ tab: "links" }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [respondOpen, setRespondOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [currency, setCurrency] = useState("MXN");
  const [respondMessage, setRespondMessage] = useState("");
  const [inclusions, setInclusions] = useState("");
  const [declineReason, setDeclineReason] = useState("");

  const listQuery = useQuery({
    queryKey: [...LIST_KEY, statusFilter, page],
    queryFn: () =>
      organizerRequestsService.list({
        page,
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
        sort: "created_at",
        order: "desc",
      }),
  });

  const unreadQuery = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: () => organizerRequestsService.unreadCount(),
    refetchInterval: UNREAD_REFRESH_MS,
  });

  const detailQuery = useQuery({
    queryKey: [...LIST_KEY, "detail", selectedId],
    queryFn: () => organizerRequestsService.get(selectedId!),
    enabled: Boolean(selectedId),
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
    queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
  }, [queryClient]);

  const onError = useCallback(() => {
    addToast(t("requests:toast.error"), "error");
  }, [addToast, t]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => organizerRequestsService.markRead(id),
    onSuccess: () => {
      invalidateAll();
      addToast(t("requests:toast.marked_read"), "success");
    },
    onError,
  });

  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      organizerRequestsService.decline(id, reason),
    onSuccess: () => {
      setDeclineOpen(false);
      setDeclineReason("");
      invalidateAll();
      addToast(t("requests:toast.declined"), "success");
    },
    onError,
  });

  const respondMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      quote_amount: number;
      currency: string;
      message?: string;
      inclusions?: string[];
    }) =>
      organizerRequestsService.respond(payload.id, {
        quote_amount: payload.quote_amount,
        currency: payload.currency,
        message: payload.message,
        inclusions: payload.inclusions,
      }),
    onSuccess: () => {
      setRespondOpen(false);
      setQuoteAmount("");
      setRespondMessage("");
      setInclusions("");
      invalidateAll();
      addToast(t("requests:toast.responded"), "success");
    },
    onError,
  });

  const requestInfoMutation = useMutation({
    mutationFn: (id: string) => organizerRequestsService.requestInfo(id),
    onSuccess: () => {
      invalidateAll();
      addToast(t("requests:toast.info_requested"), "success");
    },
    onError,
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => organizerRequestsService.convertToEvent(id),
    onSuccess: (data) => {
      invalidateAll();
      addToast(t("requests:toast.converted"), "success");
      if (data.event_id) {
        navigate(`/events/${data.event_id}/summary`);
      }
    },
    onError,
  });

  const items = listQuery.data?.data ?? [];
  const unread = unreadQuery.data ?? 0;
  // Prefer full detail (request + responses); fall back to list row while loading.
  const listRow = items.find((r) => r.id === selectedId) ?? null;
  const selected = detailQuery.data
    ? detailQuery.data
    : listRow;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const locale = i18n.language.startsWith("en") ? undefined : es;
      return format(new Date(dateStr), "dd MMM yyyy", { locale });
    } catch {
      return dateStr;
    }
  };

  const formatMoney = (amount?: number | null, curr = "MXN") => {
    if (amount == null) return "—";
    return amount.toLocaleString(
      i18n.language.startsWith("en") ? "en-US" : "es-MX",
      { style: "currency", currency: curr || "MXN" },
    );
  };

  const statusLabel = useCallback(
    (status?: string | null) => {
      if (!status) return "—";
      return t(`requests:status.${status}`, { defaultValue: status });
    },
    [t],
  );

  const canRespond = useMemo(
    () =>
      selected?.status === "pending" ||
      selected?.status === "info_requested",
    [selected?.status],
  );
  const canConvert = useMemo(
    () =>
      selected?.status === "accepted_by_client" ||
      selected?.status === "responded",
    [selected?.status],
  );

  const handleRespondSubmit = () => {
    if (!selectedId) return;
    const amount = parseFloat(quoteAmount);
    if (!Number.isFinite(amount) || amount < 0) return;
    const inclusionList = inclusions
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    respondMutation.mutate({
      id: selectedId,
      quote_amount: amount,
      currency: currency || "MXN",
      message: respondMessage.trim() || undefined,
      inclusions: inclusionList.length ? inclusionList : undefined,
    });
  };

  if (activeTab === "inbox" && listQuery.error) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-text-secondary">{t("requests:error")}</p>
        <button
          type="button"
          onClick={() => listQuery.refetch()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
        >
          {t("requests:retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <Inbox className="h-6 w-6 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-text">{t("requests:title")}</h1>
          <p className="text-sm text-text-secondary">{t("requests:subtitle")}</p>
        </div>
        {unread > 0 && activeTab === "inbox" && (
          <span
            className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 rounded-full bg-primary text-white text-xs font-bold"
            data-testid="requests-unread-badge"
          >
            {t("requests:unread_badge", { count: unread })}
          </span>
        )}
      </div>

      <div
        className="flex gap-1 border-b border-border"
        role="tablist"
        aria-label={t("requests:tabs.aria")}
        data-testid="requests-hub-tabs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "inbox"}
          onClick={() => setTab("inbox")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "inbox"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text"
          }`}
          data-testid="requests-tab-inbox"
        >
          <Inbox className="h-4 w-4" aria-hidden="true" />
          {t("requests:tabs.inbox")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "links"}
          onClick={() => setTab("links")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "links"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text"
          }`}
          data-testid="requests-tab-links"
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
          {t("requests:tabs.links")}
        </button>
      </div>

      {activeTab === "links" ? (
        <RequestLinksPanel />
      ) : (
        <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-medium text-text-secondary" htmlFor="req-status-filter">
          {t("requests:filter_status")}
        </label>
        <select
          id="req-status-filter"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm text-text"
          data-testid="requests-status-filter"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s || "all"} value={s}>
              {s
                ? t(`requests:status.${s}`)
                : t("requests:filter_all")}
            </option>
          ))}
        </select>
      </div>

      {listQuery.isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          <span className="sr-only">{t("requests:loading")}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-text-secondary">
          <CheckCircle className="h-12 w-12 text-green-500 opacity-60" aria-hidden="true" />
          <p className="text-base font-medium">{t("requests:empty")}</p>
          <p className="text-sm text-center max-w-md">{t("requests:empty_hint")}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  {[
                    t("requests:fields.contact"),
                    t("requests:fields.event_type"),
                    t("requests:fields.event_date"),
                    t("requests:fields.status"),
                    t("requests:fields.created"),
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((req) => (
                  <tr
                    key={req.id}
                    className={`hover:bg-surface-alt/50 transition-colors cursor-pointer ${
                      !req.is_read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedId(req.id ?? null)}
                    data-testid={`request-row-${req.id}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-text">
                      <div className="flex items-center gap-2">
                        {!req.is_read && (
                          <span
                            className="h-2 w-2 rounded-full bg-primary shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        <span className="truncate max-w-[180px]">
                          {req.contact_name || req.contact_email || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                      {req.event_type || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                      {formatDate(req.event_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                      {statusLabel(req.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                      {formatDate(req.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={listQuery.data?.page ?? page}
            totalPages={listQuery.data?.total_pages ?? 0}
            totalItems={listQuery.data?.total ?? 0}
            itemsPerPage={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Detail modal */}
      <Modal
        isOpen={selectedId !== null}
        onClose={() => {
          setSelectedId(null);
          setRespondOpen(false);
          setDeclineOpen(false);
        }}
        title={t("requests:detail_title")}
        maxWidth="lg"
        titleId="request-detail-title"
      >
        {detailQuery.isLoading && !selected ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : selected ? (
          <RequestDetail
            req={selected}
            formatDate={formatDate}
            formatMoney={formatMoney}
            statusLabel={statusLabel}
            t={t}
            canRespond={canRespond}
            canConvert={canConvert}
            busy={
              markReadMutation.isPending ||
              declineMutation.isPending ||
              respondMutation.isPending ||
              requestInfoMutation.isPending ||
              convertMutation.isPending
            }
            onMarkRead={() => selected.id && markReadMutation.mutate(selected.id)}
            onDecline={() => setDeclineOpen(true)}
            onRespond={() => setRespondOpen(true)}
            onRequestInfo={() =>
              selected.id && requestInfoMutation.mutate(selected.id)
            }
            onConvert={() => selected.id && convertMutation.mutate(selected.id)}
          />
        ) : null}
      </Modal>

      {/* Respond form */}
      <Modal
        isOpen={respondOpen}
        onClose={() => setRespondOpen(false)}
        title={t("requests:respond_form.title")}
        maxWidth="sm"
        titleId="request-respond-title"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary" htmlFor="quote-amount">
                {t("requests:respond_form.amount")}
              </label>
              <input
                id="quote-amount"
                type="number"
                min="0"
                step="0.01"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text"
                data-testid="respond-amount"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary" htmlFor="quote-currency">
                {t("requests:respond_form.currency")}
              </label>
              <input
                id="quote-currency"
                type="text"
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary" htmlFor="quote-message">
              {t("requests:respond_form.message")}
            </label>
            <textarea
              id="quote-message"
              rows={3}
              value={respondMessage}
              onChange={(e) => setRespondMessage(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary" htmlFor="quote-inclusions">
              {t("requests:respond_form.inclusions")}
            </label>
            <input
              id="quote-inclusions"
              type="text"
              value={inclusions}
              onChange={(e) => setInclusions(e.target.value)}
              placeholder={t("requests:respond_form.inclusions_placeholder")}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRespondOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-text"
            >
              {t("common:actions.cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              type="button"
              onClick={handleRespondSubmit}
              disabled={respondMutation.isPending || !quoteAmount}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-bold disabled:opacity-50"
              data-testid="respond-submit"
            >
              {respondMutation.isPending
                ? t("requests:actions.responding")
                : t("requests:respond_form.submit")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Decline form */}
      <Modal
        isOpen={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title={t("requests:decline_form.title")}
        maxWidth="sm"
        titleId="request-decline-title"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary" htmlFor="decline-reason">
              {t("requests:decline_form.reason")}
            </label>
            <textarea
              id="decline-reason"
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder={t("requests:decline_form.reason_placeholder")}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeclineOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-text"
            >
              {t("common:actions.cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              type="button"
              onClick={() =>
                selectedId &&
                declineMutation.mutate({
                  id: selectedId,
                  reason: declineReason.trim() || undefined,
                })
              }
              disabled={declineMutation.isPending}
              className="px-4 py-2 rounded-xl bg-error text-white text-sm font-bold disabled:opacity-50"
              data-testid="decline-submit"
            >
              {declineMutation.isPending
                ? t("requests:actions.declining")
                : t("requests:decline_form.submit")}
            </button>
          </div>
        </div>
      </Modal>
        </>
      )}
    </div>
  );
};

function RequestDetail({
  req,
  formatDate,
  formatMoney,
  statusLabel,
  t,
  canRespond,
  canConvert,
  busy,
  onMarkRead,
  onDecline,
  onRespond,
  onRequestInfo,
  onConvert,
}: {
  req: OrganizerRequestDetail | PublicRequest;
  formatDate: (d?: string | null) => string;
  formatMoney: (a?: number | null, c?: string) => string;
  statusLabel: (s?: string | null) => string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  canRespond: boolean;
  canConvert: boolean;
  busy: boolean;
  onMarkRead: () => void;
  onDecline: () => void;
  onRespond: () => void;
  onRequestInfo: () => void;
  onConvert: () => void;
}) {
  const responses =
    "responses" in req && Array.isArray(req.responses) ? req.responses : [];

  return (
    <div className="space-y-5" data-testid="request-detail">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <DetailRow label={t("requests:fields.contact")} value={req.contact_name || "—"} />
        <DetailRow label={t("requests:fields.email")} value={req.contact_email || "—"} />
        <DetailRow label={t("requests:fields.event_type")} value={req.event_type || "—"} />
        <DetailRow label={t("requests:fields.event_date")} value={formatDate(req.event_date)} />
        <DetailRow label={t("requests:fields.location")} value={req.location || "—"} />
        <DetailRow
          label={t("requests:fields.guests")}
          value={req.guest_count != null ? String(req.guest_count) : "—"}
        />
        <DetailRow
          label={t("requests:fields.budget")}
          value={formatMoney(req.budget, req.currency)}
        />
        <DetailRow label={t("requests:fields.status")} value={statusLabel(req.status)} />
        <DetailRow label={t("requests:fields.created")} value={formatDate(req.created_at)} />
      </dl>

      {req.message && (
        <div className="rounded-xl border border-border bg-surface-alt/40 p-3">
          <p className="text-xs font-medium text-text-secondary mb-1">
            {t("requests:fields.message")}
          </p>
          <p className="text-sm text-text whitespace-pre-wrap">{req.message}</p>
        </div>
      )}

      {Array.isArray(req.services) && req.services.length > 0 && (
        <div>
          <p className="text-xs font-medium text-text-secondary mb-2">
            {t("requests:fields.services")}
          </p>
          <div className="flex flex-wrap gap-2">
            {req.services.map((s, i) => (
              <span
                key={s.product_id ?? i}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-text"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {responses.length > 0 && (
        <div data-testid="request-responses">
          <p className="text-xs font-medium text-text-secondary mb-2">
            {t("requests:fields.responses", { defaultValue: "Quotes sent" })}
          </p>
          <ul className="space-y-2">
            {responses.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-border bg-surface-alt/40 p-3 text-sm"
              >
                <p className="font-semibold text-text">
                  {formatMoney(r.quote_amount, r.currency)}
                </p>
                {r.message && (
                  <p className="mt-1 text-text-secondary whitespace-pre-wrap">{r.message}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        {!req.is_read && (
          <ActionBtn
            onClick={onMarkRead}
            disabled={busy}
            icon={<MailOpen className="h-3.5 w-3.5" />}
            label={t("requests:actions.mark_read")}
            testId="action-mark-read"
          />
        )}
        {canRespond && (
          <>
            <ActionBtn
              onClick={onRespond}
              disabled={busy}
              icon={<MessageSquareReply className="h-3.5 w-3.5" />}
              label={t("requests:actions.respond")}
              primary
              testId="action-respond"
            />
            <ActionBtn
              onClick={onRequestInfo}
              disabled={busy}
              icon={<HelpCircle className="h-3.5 w-3.5" />}
              label={t("requests:actions.request_info")}
              testId="action-request-info"
            />
            <ActionBtn
              onClick={onDecline}
              disabled={busy}
              icon={<XCircle className="h-3.5 w-3.5" />}
              label={t("requests:actions.decline")}
              danger
              testId="action-decline"
            />
          </>
        )}
        {canConvert && (
          <ActionBtn
            onClick={onConvert}
            disabled={busy}
            icon={<CalendarPlus className="h-3.5 w-3.5" />}
            label={t("requests:actions.convert")}
            primary
            testId="action-convert"
          />
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="font-medium text-text break-words">{value}</dd>
    </div>
  );
}

function ActionBtn({
  onClick,
  disabled,
  icon,
  label,
  primary,
  danger,
  testId,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  danger?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-50 ${
        danger
          ? "bg-error text-white hover:opacity-90"
          : primary
            ? "bg-primary text-on-primary hover:opacity-90"
            : "border border-border bg-surface text-text hover:bg-surface-alt"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default RequestsInboxPage;
