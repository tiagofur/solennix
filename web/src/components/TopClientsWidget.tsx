import React from "react";
import { useTopClients } from "@/hooks/queries/useDashboardQueries";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Users, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import { Card } from "./Card";
import { ListGroup, ListItem } from "./ListGroup";

export function TopClientsWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, error } = useTopClients(5);

  if (isLoading) {
    return (
      <Card variant="glass" padding="md">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-text">
            {t("dashboard:widgets.top_clients.title")}
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-surface-alt/40 rounded-xl animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="glass" padding="md">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-text">
            {t("dashboard:widgets.top_clients.title")}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-error text-sm font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t("common:error.generic")}</span>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card variant="glass" padding="md">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-text">
            {t("dashboard:widgets.top_clients.title")}
          </h3>
        </div>
        <p className="text-sm text-text-secondary">
          {t("dashboard:widgets.top_clients.empty")}
        </p>
      </Card>
    );
  }

  return (
    <Card variant="glass" padding="none" className="overflow-hidden">
      <div className="flex items-center gap-3 px-6 pt-5 pb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-bold text-text">
          {t("dashboard:widgets.top_clients.title")}
        </h3>
      </div>
      <ListGroup variant="glass" className="border-0 shadow-none rounded-t-none">
        {data.map((client) => (
          <ListItem
            key={client.id}
            onClick={() => navigate(`/clients/${client.id}`)}
            className="flex items-center justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text truncate">
                {client.name}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {client.total_events}{" "}
                {t("dashboard:widgets.top_clients.events", { count: client.total_events })}
              </p>
            </div>
            <p className="text-sm font-bold text-primary whitespace-nowrap ml-2">
              {formatCurrency(client.total_spent)}
            </p>
          </ListItem>
        ))}
      </ListGroup>
    </Card>
  );
}
