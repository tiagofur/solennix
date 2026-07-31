import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, CalendarPlus, Zap, Lock } from "lucide-react";

import { DesktopToolbar } from "../../../components/DesktopToolbar";
import { Button } from "../../../components/Button";

/**
 * Unified toolbar for the Events page.
 *
 * De-duplicates the previously-near-identical desktop sticky toolbar and the
 * mobile in-content header (issue #881). The parent renders this ONCE; it
 * emits both responsive variants from a single source of truth for the
 * segmented view-mode toggle and the global actions (Export .ics / Manage
 * blocks / Export CSV / Quick quote / New event).
 *
 * State stays in the parent: this component is presentational and receives the
 * current `viewMode` plus callbacks.
 */

export type EventsViewMode = "list" | "calendar";

export interface EventsToolbarProps {
  viewMode: EventsViewMode;
  /** Count shown next to the title on mobile (list view only). */
  headerCount?: number;
  loading?: boolean;
  /** Fired with the new view mode when the segmented control toggles. */
  onToggleView: (mode: EventsViewMode) => void;
  onExportIcal: () => void;
  isExportingIcal: boolean;
  onManageBlocks: () => void;
  onExportCsv: () => void;
  /** Rows available for CSV export — the export button hides when this is 0. */
  csvRowCount: number;
}

/**
 * Segmented list/calendar toggle. Shared between desktop and mobile so they
 * can never drift apart.
 */
const ViewModeToggle: React.FC<{
  viewMode: EventsViewMode;
  onToggle: (mode: EventsViewMode) => void;
}> = ({ viewMode, onToggle }) => {
  const { t } = useTranslation(["events"]);
  return (
    <div className="inline-flex rounded-xl bg-surface-alt/80 p-0.5 border border-border/60 backdrop-blur-xs">
      <button
        type="button"
        onClick={() => onToggle("list")}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active-ios-scale ${
          viewMode === "list"
            ? "bg-card text-text shadow-sm border border-border/30"
            : "text-text-secondary hover:text-text"
        }`}
      >
        {t("events:list.view_mode.list")}
      </button>
      <button
        type="button"
        onClick={() => onToggle("calendar")}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active-ios-scale ${
          viewMode === "calendar"
            ? "bg-card text-text shadow-sm border border-border/30"
            : "text-text-secondary hover:text-text"
        }`}
      >
        {t("events:list.view_mode.calendar")}
      </button>
    </div>
  );
};

/** Shared global-actions cluster (Export .ics, Manage blocks, CSV, links). */
const GlobalActions: React.FC<{
  viewMode: EventsViewMode;
  onExportIcal: () => void;
  isExportingIcal: boolean;
  onManageBlocks: () => void;
  onExportCsv: () => void;
  csvRowCount: number;
}> = ({ viewMode, onExportIcal, isExportingIcal, onManageBlocks, onExportCsv, csvRowCount }) => {
  const { t } = useTranslation(["events", "calendar"]);
  return (
    <>
      {viewMode === "calendar" && (
        <>
          <Button
            variant="glass"
            size="md"
            onClick={onExportIcal}
            disabled={isExportingIcal}
            className="active-ios-scale"
          >
            {isExportingIcal ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-text border-t-transparent mr-2" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            )}
            {t("calendar:export_ics")}
          </Button>
          <Button
            variant="glass"
            size="md"
            onClick={onManageBlocks}
            className="active-ios-scale"
          >
            <Lock className="h-4 w-4 mr-2" aria-hidden="true" />
            {t("calendar:manage_blocks")}
          </Button>
        </>
      )}

      {viewMode === "list" && csvRowCount > 0 && (
        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt shadow-sm transition-colors"
          aria-label={t("events:list.export_csv_aria")}
        >
          <Download className="h-4 w-4 mr-2" aria-hidden="true" />
          {t("events:list.export_csv")}
        </button>
      )}

      <Link
        to="/cotizacion-rapida"
        className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-bold rounded-xl text-text-secondary bg-card hover:bg-surface-alt shadow-sm transition-colors"
      >
        <Zap className="h-4 w-4 mr-2" aria-hidden="true" />
        {t("events:list.quick_quote")}
      </Link>
      <Link
        to="/events/new"
        className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02]"
      >
        <CalendarPlus className="h-5 w-5 mr-2" aria-hidden="true" />
        {t("events:list.new_event")}
      </Link>
    </>
  );
};

export const EventsToolbar: React.FC<EventsToolbarProps> = ({
  viewMode,
  headerCount = 0,
  loading = false,
  onToggleView,
  onExportIcal,
  isExportingIcal,
  onManageBlocks,
  onExportCsv,
  csvRowCount,
}) => {
  const { t } = useTranslation(["events"]);

  return (
    <>
      {/* Desktop: persistent sticky toolbar (#881) */}
      <DesktopToolbar
        title={t("events:list.title")}
        actions={
          <>
            <ViewModeToggle viewMode={viewMode} onToggle={onToggleView} />
            <GlobalActions
              viewMode={viewMode}
              onExportIcal={onExportIcal}
              isExportingIcal={isExportingIcal}
              onManageBlocks={onManageBlocks}
              onExportCsv={onExportCsv}
              csvRowCount={csvRowCount}
            />
          </>
        }
      />

      {/* Page Header (mobile) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 lg:hidden">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-text tracking-tight">
            {t("events:list.title")}{" "}
            {viewMode === "list" && !loading && headerCount > 0 && (
              <span className="text-base font-semibold text-text-secondary">
                ({headerCount})
              </span>
            )}
          </h1>
          <ViewModeToggle viewMode={viewMode} onToggle={onToggleView} />
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-2">
          <GlobalActions
            viewMode={viewMode}
            onExportIcal={onExportIcal}
            isExportingIcal={isExportingIcal}
            onManageBlocks={onManageBlocks}
            onExportCsv={onExportCsv}
            csvRowCount={csvRowCount}
          />
        </div>
      </div>
    </>
  );
};

export default EventsToolbar;
