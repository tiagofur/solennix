import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Client } from "@/types/entities";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  Download,
  Users,
  Eye,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { RowActionMenu } from "@/components/RowActionMenu";
import { OptimizedImage } from "@/components/OptimizedImage";
import { exportToCsv } from "@/lib/exportCsv";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import Empty from "@/components/Empty";
import { Pagination } from "@/components/Pagination";
import { SkeletonTable } from "@/components/Skeleton";
import {
  useClients,
  useClientsPaginated,
  useDeleteClient,
} from "@/hooks/queries/useClientQueries";

const ITEMS_PER_PAGE = 8;

export const ClientList: React.FC = () => {
  const { t, i18n } = useTranslation(["clients", "common"]);
  const deleteClient = useDeleteClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof Client | "">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const navigate = useNavigate();

  const isSearching = searchTerm.trim().length > 0;

  // Server-side paginated query (used when NOT searching)
  const paginatedQuery = useClientsPaginated({
    page,
    limit: ITEMS_PER_PAGE,
    sort: sortKey || undefined,
    order: sortOrder,
  });

  // Full client list query (used only when searching, for client-side filtering)
  const allClientsQuery = useClients();

  // Pick the correct loading state
  const loading = isSearching ? allClientsQuery.isLoading : paginatedQuery.isLoading;

  // All clients for CSV export and search filtering
  const allClients = useMemo(() => allClientsQuery.data ?? [], [allClientsQuery.data]);

  // Client-side filtered results (only used when searching)
  const filteredClients = useMemo(() => {
    if (!isSearching) return [];
    const term = searchTerm.toLowerCase();
    return allClients.filter(
      (client) =>
        client.name.toLowerCase().includes(term) ||
        (client.email && client.email.toLowerCase().includes(term)) ||
        client.phone.includes(searchTerm),
    );
  }, [allClients, searchTerm, isSearching]);

  // Client-side sorting for search results
  const sortedFilteredClients = useMemo(() => {
    if (!isSearching || !sortKey) return filteredClients;
    return [...filteredClients].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      const isAsc = sortOrder === "asc";
      if (typeof aVal === "string" && typeof bVal === "string") {
        return isAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if ((aVal ?? 0) > (bVal ?? 0)) return isAsc ? 1 : -1;
      if ((aVal ?? 0) < (bVal ?? 0)) return isAsc ? -1 : 1;
      return 0;
    });
  }, [filteredClients, sortKey, sortOrder, isSearching]);

  // Client-side pagination for search results
  const searchPage = Math.min(page, Math.max(1, Math.ceil(sortedFilteredClients.length / ITEMS_PER_PAGE)));
  const searchPaginatedClients = useMemo(() => {
    const start = (searchPage - 1) * ITEMS_PER_PAGE;
    return sortedFilteredClients.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedFilteredClients, searchPage]);

  // Unified data for the table
  const paginatedClients = isSearching
    ? searchPaginatedClients
    : (paginatedQuery.data?.data ?? []);

  const currentPage = isSearching
    ? searchPage
    : (paginatedQuery.data?.page ?? page);

  const totalPages = isSearching
    ? Math.max(1, Math.ceil(sortedFilteredClients.length / ITEMS_PER_PAGE))
    : (paginatedQuery.data?.total_pages ?? 1);

  const totalItems = isSearching
    ? sortedFilteredClients.length
    : (paginatedQuery.data?.total ?? 0);

  // For the empty state and CSV export, we need to know if there are any clients at all
  const hasAnyClients = useMemo(() => {
    return isSearching
      ? allClients.length > 0
      : (paginatedQuery.data?.total ?? 0) > 0 || paginatedClients.length > 0;
  }, [isSearching, allClients.length, paginatedQuery.data?.total, paginatedClients.length]);

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setConfirmOpen(false);
    setPendingDeleteId(null);
    deleteClient.mutate(id);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSort = (key: keyof Client) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
    setPage(1);
  };

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
        title={t("common:action.delete")}
        description={t("clients:delete_confirm")}
        confirmText={t("common:action.delete")}
        cancelText={t("common:action.cancel")}
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-text tracking-tight">
          {t("clients:title")}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {hasAnyClients && (
            <button
              type="button"
              onClick={() =>
                exportToCsv(
                  t("clients:export_file_name"),
                  [
                    t("clients:form.name"),
                    t("clients:form.phone"),
                    t("clients:form.email"),
                    t("clients:form.address"),
                    t("clients:form.city"),
                    t("clients:table.events"),
                    t("clients:details.total_spent"),
                    t("clients:form.notes"),
                  ],
                  allClients.map((c) => [
                    c.name,
                    c.phone,
                    c.email,
                    c.address,
                    c.city,
                    c.total_events,
                    c.total_spent?.toFixed(2),
                    c.notes,
                  ]),
                )
              }
              className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt shadow-sm transition-colors"
            >
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              CSV
            </button>
          )}
          <Link
            to="/clients/new"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
            {t("clients:new_client")}
          </Link>
        </div>
      </div>

      <div className="relative max-w-md">
        <label htmlFor="client-search" className="sr-only">
          {t("common:action.search")}
        </label>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-text-secondary" aria-hidden="true" />
        </div>
        <input
          id="client-search"
          type="search"
          className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl leading-5 bg-card text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary sm:text-sm transition duration-150 ease-in-out"
          placeholder={t("clients:search_placeholder")}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="bg-card shadow-sm overflow-hidden rounded-2xl border border-border">
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
        ) : paginatedClients.length === 0 ? (
          <Empty
            icon={Users}
            title={t("clients:no_clients")}
            description={
              searchTerm
                ? t("clients:search_no_results")
                : t("clients:empty_description")
            }
            action={
              !searchTerm ? (
                <Link
                  to="/clients/new"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
                  {t("clients:new_client")}
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table
              className="min-w-full divide-y divide-border"
              aria-label={t("clients:title")}
            >
              <caption className="sr-only">
                {t("common:pagination.showing")} {currentPage} {t("common:pagination.of")} {totalPages}
              </caption>
              <thead className="bg-surface-alt">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
                    onClick={() => handleSort("name")}
                    aria-sort={getSortAriaSort("name")}
                  >
                    {t("clients:table.name")} {renderSortIcon("name")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-text-secondary"
                  >
                    {t("clients:table.contact")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
                    onClick={() => handleSort("total_events")}
                    aria-sort={getSortAriaSort("total_events")}
                  >
                    {t("clients:table.events")} {renderSortIcon("total_events")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
                    onClick={() => handleSort("total_spent")}
                    aria-sort={getSortAriaSort("total_spent")}
                  >
                      {t("clients:table.total")} {renderSortIcon("total_spent")}
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">{t("clients:table.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {paginatedClients.map((client) => (
                  <tr
                    key={client.id}
                    className="group hover:bg-surface-alt/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {client.photo_url ? (
                          <OptimizedImage
                            src={client.photo_url}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold"
                            aria-hidden="true"
                          >
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-text">
                            {client.name}
                          </div>
                          <div className="text-xs text-text-secondary truncate max-w-50">
                            {client.city || client.address || "—"}
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
                          className="text-primary hover:text-primary-dark transition-colors"
                          onClick={(e) => e.stopPropagation()}
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
                            className="text-primary hover:text-primary-dark transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {client.email}
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-success/10 text-success">
                        {client.total_events}{" "}
                        {client.total_events === 1
                          ? t("clients:event_singular")
                          : t("clients:event_plural")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
                      $
                      {(client.total_spent ?? 0).toLocaleString(i18n.language === "en" ? "en-US" : "es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <RowActionMenu items={[
                          { label: t("common:action.view"), icon: Eye, onClick: () => navigate(`/clients/${client.id}`) },
                          { label: t("common:action.edit"), icon: Edit, onClick: () => navigate(`/clients/${client.id}/edit`) },
                          ...(client.phone ? [{ label: t("clients:form.phone"), icon: Phone, onClick: () => window.open(`tel:${client.phone}`) }] : []),
                          ...(client.email ? [{ label: t("clients:form.email"), icon: Mail, onClick: () => window.open(`mailto:${client.email}`) }] : []),
                          { label: t("common:action.delete"), icon: Trash2, onClick: () => requestDelete(client.id), variant: 'destructive' as const },
                        ]} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && paginatedClients.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
};
