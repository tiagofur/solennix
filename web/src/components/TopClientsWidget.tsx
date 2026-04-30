import React from "react";
import { useTopClients } from "@/hooks/queries/useDashboardQueries";
import { useTranslation } from "react-i18next";
import { Users, AlertTriangle, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/finance";

export function TopClientsWidget() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useTopClients(5);

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("dashboard:widgets.top_clients.title")}
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-surface-alt rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("dashboard:widgets.top_clients.title")}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-error text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t("common:error.generic")}</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("dashboard:widgets.top_clients.title")}
          </h3>
        </div>
        <p className="text-sm text-foreground-secondary">
          {t("dashboard:widgets.top_clients.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {t("dashboard:widgets.top_clients.title")}
        </h3>
      </div>
      <div className="space-y-3">
        {data.map((client) => (
          <div
            key={client.id}
            className="flex items-center justify-between p-3 bg-surface-alt rounded-lg hover:bg-surface-alt/80 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {client.name}
              </p>
              <p className="text-xs text-foreground-secondary">
                {client.total_events}{" "}
                {t("dashboard:widgets.top_clients.events", { count: client.total_events })}
              </p>
            </div>
            <p className="text-sm font-semibold text-primary whitespace-nowrap ml-2">
              {formatCurrency(client.total_spent)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
