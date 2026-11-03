import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FileSpreadsheet, Download, Sparkles, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/Modal";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useToast } from "@/hooks/useToast";
import { downloadAccountingExport } from "@/services/reportService";
import { logError } from "@/lib/errorHandler";

interface AccountingExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RangePreset = "all" | "year" | "quarter" | "custom";

export const AccountingExportModal: React.FC<AccountingExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation(["events", "common"]);
  const { isBasicPlan } = usePlanLimits();
  const { addToast } = useToast();

  const currentYear = new Date().getFullYear();
  const [preset, setPreset] = useState<RangePreset>("year");
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [isExporting, setIsExporting] = useState(false);

  const formatLocalDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const handlePresetChange = (newPreset: RangePreset) => {
    setPreset(newPreset);
    const now = new Date();
    if (newPreset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (newPreset === "year") {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(`${now.getFullYear()}-12-31`);
    } else if (newPreset === "quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const qStart = new Date(now.getFullYear(), qMonth, 1);
      const qEnd = new Date(now.getFullYear(), qMonth + 3, 0);
      setStartDate(formatLocalDate(qStart));
      setEndDate(formatLocalDate(qEnd));
    }
  };

  const handleExport = async () => {
    if (isBasicPlan) return;
    setIsExporting(true);
    try {
      await downloadAccountingExport({
        startDate: preset === "all" ? undefined : startDate,
        endDate: preset === "all" ? undefined : endDate,
      });
      addToast(t("events:export_accounting.success", { defaultValue: "Reporte contable descargado con éxito." }), "success");
      onClose();
    } catch (err) {
      logError("Failed to export accounting", err);
      addToast(t("events:export_accounting.error", { defaultValue: "Error al generar el reporte contable." }), "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("events:export_accounting.title", { defaultValue: "Exportación Contable" })}
      maxWidth="md"
    >
      <div className="space-y-6">
        <p className="text-sm text-text-secondary">
          {t("events:export_accounting.description", {
            defaultValue:
              "Descarga un archivo Excel (.csv) con el balance detallado de eventos, pagos, saldos pendientes y costos de personal.",
          })}
        </p>

        {isBasicPlan ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-text">
                  {t("events:export_accounting.plan_required_title", { defaultValue: "Función de planes Pro y Business" })}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {t("events:export_accounting.plan_required_desc", {
                    defaultValue: "La exportación contable para Excel está disponible a partir del plan Pro.",
                  })}
                </p>
              </div>
            </div>
            <Link
              to="/pricing"
              onClick={onClose}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-bold rounded-xl text-white bg-primary hover:bg-primary-dark transition-colors shadow-sm"
            >
              <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
              {t("events:export_accounting.upgrade_cta", { defaultValue: "Ver planes Pro y Business" })}
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Presets */}
            <div>
              <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                {t("events:export_accounting.period", { defaultValue: "Período" })}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: "year", label: `Año ${currentYear}` },
                    { id: "quarter", label: "Trimestre" },
                    { id: "all", label: "Historial" },
                    { id: "custom", label: "Personalizado" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handlePresetChange(opt.id)}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                      preset === opt.id
                        ? "bg-primary text-white border-primary"
                        : "bg-surface-alt text-text-secondary border-border hover:bg-card"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom date range fields */}
            {preset === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-surface-alt/50 border border-border rounded-xl">
                <div>
                  <label htmlFor="export-start-date" className="block text-xs font-medium text-text-secondary mb-1">
                    {t("events:export_accounting.from_date", { defaultValue: "Desde" })}
                  </label>
                  <input
                    id="export-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-sm rounded-xl border border-border bg-card px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="export-end-date" className="block text-xs font-medium text-text-secondary mb-1">
                    {t("events:export_accounting.to_date", { defaultValue: "Hasta" })}
                  </label>
                  <input
                    id="export-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-sm rounded-xl border border-border bg-card px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
              </div>
            )}

            {/* Highlighted format benefit */}
            <div className="flex items-start gap-3 p-3 bg-surface-alt/40 border border-border rounded-xl text-xs text-text-secondary">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-text">
                  {t("events:export_accounting.excel_ready", { defaultValue: "Formato nativo para Microsoft Excel" })}
                </p>
                <p className="text-text-tertiary mt-0.5">
                  {t("events:export_accounting.excel_desc", {
                    defaultValue:
                      "Codificado con UTF-8 BOM para abrir directamente en Excel o Numbers con acentos, columnas y montos.",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-xl text-text-secondary bg-surface-alt hover:bg-card border border-border transition-colors"
              >
                {t("common:actions.cancel", { defaultValue: "Cancelar" })}
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02] disabled:opacity-60"
              >
                {isExporting ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" aria-hidden="true" />
                ) : (
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                )}
                {t("events:export_accounting.action_download", { defaultValue: "Descargar Excel (CSV)" })}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
