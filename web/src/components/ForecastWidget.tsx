import React from "react";
import { useForecast } from "@/hooks/queries/useDashboardQueries";
import { useTranslation } from "react-i18next";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import { format, parse } from "date-fns";
import { enUS, es } from "date-fns/locale";

export function ForecastWidget() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, error } = useForecast();

  const formatMonthYear = (monthStr: string) => {
    try {
      const parsed = parse(monthStr, "yyyy-MM", new Date());
      return format(parsed, "MMM yyyy", { locale: i18n.language === "en" ? enUS : es });
    } catch {
      return monthStr;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("dashboard:widgets.forecast.title")}
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
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("dashboard:widgets.forecast.title")}
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
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("dashboard:widgets.forecast.title")}
          </h3>
        </div>
        <p className="text-sm text-foreground-secondary">
          {t("dashboard:widgets.forecast.empty")}
        </p>
      </div>
    );
  }

  const totalRevenue = data.reduce((sum, item) => sum + item.confirmed_revenue, 0);
  const totalEvents = data.reduce((sum, item) => sum + item.confirmed_events, 0);

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {t("dashboard:widgets.forecast.title")}
        </h3>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-surface-alt rounded-lg">
        <div>
          <p className="text-xs text-foreground-secondary">
            {t("dashboard:widgets.forecast.projected_revenue")}
          </p>
          <p className="text-sm font-semibold text-primary">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-foreground-secondary">
            {t("dashboard:widgets.forecast.confirmed_events")}
          </p>
          <p className="text-sm font-semibold text-primary">{totalEvents}</p>
        </div>
      </div>

      {/* Monthly breakdown */}
      <div className="space-y-2">
        {data.slice(0, 4).map((item) => (
          <div
            key={item.month}
            className="flex items-center justify-between p-2 bg-surface-alt rounded text-sm"
          >
            <span className="text-foreground-secondary">
              {formatMonthYear(item.month)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-foreground-secondary">
                {item.confirmed_events}
              </span>
              <span className="font-semibold text-primary">
                {formatCurrency(item.confirmed_revenue)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
