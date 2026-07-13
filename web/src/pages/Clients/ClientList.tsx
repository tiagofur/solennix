import React, { useState, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  MousePointerClick,
} from "lucide-react";
import { RowActionMenu, type RowActionMenuItem } from "@/components/RowActionMenu";
import { DesktopToolbar } from "@/components/DesktopToolbar";
import { ContextMenu } from "@/components/ContextMenu";
import { BulkActionBar } from "@/components/BulkActionBar";
import { useRowSelection } from "@/hooks/useRowSelection";
import { useIsXl } from "@/hooks/useBreakpoint";
import { OptimizedImage } from "@/components/OptimizedImage";
import { SplitPane } from "@/components/SplitPane";
import { exportToCsv } from "@/lib/exportCsv";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import Empty from "@/components/Empty";
import { Pagination } from "@/components/Pagination";
import { SkeletonTable } from "@/components/Skeleton";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import {
  useClients,
  useClientsPaginated,
  useDeleteClient,
} from "@/hooks/queries/useClientQueries";
import { ClientDetailPanel } from "./ClientDetails";

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
  // Master-detail split pane (#879): at xl+, selecting a row opens detail in
  // the right rail via the `selected` URL param; below xl rows navigate.
  const isXl = useIsXl();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("selected");

  const selectClient = useCallback(
    (clientId: string) => {
      setSearchParams(
        (prev) => {
          prev.set("selected", clientId);
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearSelected = useCallback(() => {
    setSearchParams(
      (prev) => {
        prev.delete("selected");
        return prev;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  // Context-menu state (#883): row right-click opens positioned menu.
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; clientId: string } | null>(null);

  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

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

  // Multi-select for bulk actions (#885) — desktop only column.
  const selection = useRowSelection(paginatedClients.map((c) => c.id));

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

  const getRowActions = useCallback(
    (clientId: string, phone?: string, email?: string): RowActionMenuItem[] => [
      { label: t("common:action.view"), icon: Eye, onClick: () => (isXl ? selectClient(clientId) : navigate(`/clients/${clientId}`)) },
      { label: t("common:action.edit"), icon: Edit, onClick: () => navigate(`/clients/${clientId}/edit`) },
      ...(phone ? [{ label: t("clients:form.phone"), icon: Phone, onClick: () => window.open(`tel:${phone}`) }] : []),
      ...(email ? [{ label: t("clients:form.email"), icon: Mail, onClick: () => window.open(`mailto:${email}`) }] : []),
      { label: t("common:action.delete"), icon: Trash2, onClick: () => requestDelete(clientId), variant: 'destructive' as const },
    ],
    // requestDelete is stable (closes over setState only)
    [t, navigate, isXl, selectClient],
  );

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setConfirmOpen(false);
    setPendingDeleteId(null);
    deleteClient.mutate(id);
  };

  // Bulk delete selected clients (#885)
  const bulkDelete = () => {
    selection.selectedArray.forEach((id) => deleteClient.mutate(id));
    selection.clear();
  };

  // Export only selected clients (#885)
  const exportSelected = () => {
    const selectedClients = allClients.filter((c) => selection.selected.has(c.id));
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
      selectedClients.map((c) => [
        c.name,
        c.phone,
        c.email,
        c.address,
        c.city,
        c.total_events,
        c.total_spent?.toFixed(2),
        c.notes,
      ]),
    );
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

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {hasAnyClients && (
        <Button
          variant="glass"
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
        >
          <Download className="h-4 w-4 mr-2" aria-hidden="true" />
          CSV
        </Button>
      )}
      <Button variant="primary" onClick={() => navigate("/clients/new")}>
        <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
        {t("clients:new_client")}
      </Button>
    </div>
  );

  // Master-detail split pane (#879): the list chrome is identical on every
  // breakpoint; at xl+ it becomes the left rail with the detail panel on the
  // right. Below xl the detail is hidden and rows navigate to the full page.
  const detailPanel = selectedId ? (
    <ClientDetailPanel clientId={selectedId} embedded onDeleted={clearSelected} />
  ) : (
    <Empty
      icon={MousePointerClick}
      showImage={false}
      title={t("common:split.select_client")}
      description={t("common:split.select_client_hint")}
      className="h-full justify-center"
    />
  );

  const listContent = (
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
      {/* Desktop: persistent sticky toolbar (#881) */}
      <DesktopToolbar title={t("clients:title")} actions={headerActions} />
      {/* Mobile: in-content header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 lg:hidden">
        <h1 className="text-2xl font-bold text-text tracking-tight">
          {t("clients:title")}
        </h1>
        {headerActions}
      </div>

      <div className="relative max-w-md">
        <label htmlFor="client-search" className="sr-only">
          {t("common:action.search")}
        </label>
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary pointer-events-none z-10" aria-hidden="true" />
        <Input
          id="client-search"
          type="search"
          className="pl-11 bg-card/60 hover:bg-surface-alt/40 focus:bg-card focus:border-primary"
          placeholder={t("clients:search_placeholder")}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card variant="glass" padding="none" className="overflow-hidden">
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
              className="data-table"
              aria-label={t("clients:title")}
            >
              <caption className="sr-only">
                {t("common:pagination.showing")} {currentPage} {t("common:pagination.of")} {totalPages}
              </caption>
              <thead>
                <tr>
                  {/* Multi-select checkbox (#885) — desktop only */}
                  <th scope="col" className="px-2 py-3 w-10 text-center hidden lg:table-cell">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer align-middle"
                      checked={selection.allSelected}
                      ref={(el) => { if (el) el.indeterminate = selection.someSelected; }}
                      onChange={selection.toggleAll}
                      aria-label="Seleccionar todos los clientes"
                    />
                  </th>
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
              <tbody>
                {paginatedClients.map((client) => {
                  const isActiveRow = client.id === selectedId;
                  return (
                  <tr
                    key={client.id}
                    className={`group cursor-pointer transition-colors ${isActiveRow ? "bg-surface-alt ring-1 ring-inset ring-primary/30" : "hover:bg-surface-alt/50"}`}
                    onClick={() => (isXl ? selectClient(client.id) : navigate(`/clients/${client.id}`))}
                    aria-current={isActiveRow ? "true" : undefined}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setCtxMenu({ x: e.clientX, y: e.clientY, clientId: client.id });
                    }}
                  >
                    {/* Multi-select checkbox (#885) — desktop only */}
                    <td className="px-2 py-4 w-10 text-center hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer align-middle"
                        checked={selection.selected.has(client.id)}
                        onChange={() => selection.toggle(client.id)}
                        aria-label={`Seleccionar ${client.name}`}
                      />
                    </td>
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
                        <RowActionMenu items={getRowActions(client.id, client.phone, client.email)} />
                      </div>
                    </td>
                  </tr>
                  );
                })}
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
      </Card>

      {/* Bulk actions bar (#885) — desktop only */}
      <BulkActionBar count={selection.count} onClear={selection.clear}>
        <Button variant="glass" size="sm" onClick={exportSelected}>
          <Download className="h-4 w-4 mr-2" aria-hidden="true" />
          {t("common:action.download")}
        </Button>
        <Button variant="danger" size="sm" onClick={bulkDelete}>
          <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
          {t("common:action.delete")}
        </Button>
      </BulkActionBar>

      {/* Right-click context menu (#883) */}
      {ctxMenu && (
        <ContextMenu
          position={{ x: ctxMenu.x, y: ctxMenu.y }}
          items={getRowActions(
            ctxMenu.clientId,
            paginatedClients.find((c) => c.id === ctxMenu.clientId)?.phone,
            paginatedClients.find((c) => c.id === ctxMenu.clientId)?.email,
          )}
          onClose={closeCtxMenu}
        />
      )}
    </div>
  );

  if (isXl) {
    return (
      <SplitPane
        master={listContent}
        detail={detailPanel}
        masterClassName="xl:overflow-y-auto xl:min-h-0 xl:pr-1"
      />
    );
  }

  return listContent;
};
