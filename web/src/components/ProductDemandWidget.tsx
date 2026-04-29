import React from "react";
import { useProductDemand } from "@/hooks/queries/useDashboardQueries";
import { useTranslation } from "react-i18next";
import { Package, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/finance";

export function ProductDemandWidget() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useProductDemand();

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("dashboard.productDemand", "Product Demand")}
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
          <Package className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("dashboard.productDemand", "Product Demand")}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-error text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t("common.error", "Error loading data")}</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("dashboard.productDemand", "Product Demand")}
          </h3>
        </div>
        <p className="text-sm text-foreground-secondary">
          {t("dashboard.noProducts", "No product data yet")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Package className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {t("dashboard.productDemand", "Product Demand")}
        </h3>
      </div>
      <div className="space-y-3">
        {data.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 bg-surface-alt rounded-lg hover:bg-surface-alt/80 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {item.name}
              </p>
              <p className="text-xs text-foreground-secondary">
                {item.times_used}{" "}
                {t("common.uses", "use", { count: item.times_used })}
              </p>
            </div>
            <p className="text-sm font-semibold text-primary whitespace-nowrap ml-2">
              {formatCurrency(item.total_revenue)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
