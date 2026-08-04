import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Eye,
  Users,
  MessageSquare,
  CheckCircle2,
  CalendarCheck,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  inboundAnalyticsService,
  type InboundPeriodDays,
} from "@/services/inboundAnalyticsService";
import { usePlanLimits } from "@/hooks/usePlanLimits";

const PERIODS: InboundPeriodDays[] = [7, 30, 90];

/**
 * Organizer inbound analytics (#1131) — visits to /u/:slug, request funnel,
 * conversion. Free plan sees a teaser (views only) + upsell.
 */
export const InboundAnalyticsPage: React.FC = () => {
  const { t } = useTranslation(["inbound", "common"]);
  const { isBasicPlan } = usePlanLimits();
  const [days, setDays] = useState<InboundPeriodDays>(30);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["inbound-analytics", days],
    queryFn: () => inboundAnalyticsService.get(days),
  });

  const chartData = useMemo(
    () =>
      (data?.views_by_day ?? []).map((d) => ({
        date: d.date.slice(5), // MM-DD for axis
        count: d.count,
      })),
    [data?.views_by_day],
  );

  const pct = data?.views_change_pct;
  const PctIcon =
    pct == null ? Minus : pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const pctColor =
    pct == null
      ? "text-text-tertiary"
      : pct > 0
        ? "text-success"
        : pct < 0
          ? "text-error"
          : "text-text-tertiary";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8" data-testid="inbound-analytics-page">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text">
            {t("inbound:title")}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{t("inbound:subtitle")}</p>
        </div>
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDays(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                days === p
                  ? "bg-primary text-on-primary"
                  : "text-text-secondary hover:text-text"
              }`}
              data-testid={`period-${p}`}
            >
              {t("inbound:period_days", { days: p })}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        </div>
      )}

      {isError && (
        <p className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {t("inbound:error")}
        </p>
      )}

      {data && !isLoading && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={<Eye className="h-4 w-4" />}
              label={t("inbound:kpi.views")}
              value={data.views}
              hint={
                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${pctColor}`}>
                  <PctIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {pct == null
                    ? t("inbound:kpi.no_baseline")
                    : t("inbound:kpi.change_pct", { pct: pct.toFixed(0) })}
                </span>
              }
            />
            <KpiCard
              icon={<Users className="h-4 w-4" />}
              label={t("inbound:kpi.unique")}
              value={data.unique_visitors}
            />
            <KpiCard
              icon={<MessageSquare className="h-4 w-4" />}
              label={t("inbound:kpi.requests")}
              value={data.limited ? "—" : data.requests}
              locked={data.limited}
            />
            <KpiCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label={t("inbound:kpi.response_rate")}
              value={
                data.limited
                  ? "—"
                  : t("inbound:kpi.percent", {
                      value: Math.round(data.response_rate * 100),
                    })
              }
              locked={data.limited}
            />
          </div>

          {!data.limited && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <KpiCard
                icon={<CalendarCheck className="h-4 w-4" />}
                label={t("inbound:kpi.converted")}
                value={data.converted}
              />
              <KpiCard
                icon={<TrendingUp className="h-4 w-4" />}
                label={t("inbound:kpi.conversion_rate")}
                value={t("inbound:kpi.percent", {
                  value: Math.round(data.conversion_rate * 100),
                })}
              />
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-bold text-text">
              {t("inbound:chart.views_title")}
            </h2>
            {chartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-secondary">
                {t("inbound:chart.empty")}
              </p>
            ) : (
              <div className="h-56 w-full" data-testid="views-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--color-primary, #c9a227)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {!data.limited && Object.keys(data.sources).length > 0 && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-6">
              <h2 className="mb-3 text-sm font-bold text-text">
                {t("inbound:sources.title")}
              </h2>
              <ul className="space-y-2">
                {Object.entries(data.sources)
                  .sort((a, b) => b[1] - a[1])
                  .map(([src, count]) => (
                    <li
                      key={src}
                      className="flex items-center justify-between text-sm text-text"
                    >
                      <span>{t(`inbound:sources.${src}`, { defaultValue: src })}</span>
                      <span className="font-semibold">{count}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {(data.limited || isBasicPlan) && (
            <div
              className="mt-6 flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between"
              data-testid="inbound-upsell"
            >
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-text">{t("inbound:upsell.title")}</p>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {t("inbound:upsell.body")}
                  </p>
                </div>
              </div>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:opacity-90"
              >
                {t("inbound:upsell.cta")}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  locked?: boolean;
}> = ({ icon, label, value, hint, locked }) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <div className="flex items-center gap-2 text-text-secondary">
      {icon}
      <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      {locked && <Lock className="h-3 w-3 text-text-tertiary" aria-hidden="true" />}
    </div>
    <p className="mt-2 text-2xl font-black tracking-tight text-text">{value}</p>
    {hint && <div className="mt-1">{hint}</div>}
  </div>
);
