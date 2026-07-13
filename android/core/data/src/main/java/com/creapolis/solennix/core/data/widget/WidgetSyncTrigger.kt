package com.creapolis.solennix.core.data.widget

import com.creapolis.solennix.core.model.DashboardKPIs

/**
 * Asks the widget subsystem to refresh home-screen widgets. Implemented in the `:app`
 * module by `WidgetSyncCoordinator` (which drives `GlanceAppWidgetManager`/`updateAll`),
 * and injected into feature ViewModels and `SyncWorker` via Hilt.
 *
 * The interface lives in `:core:data` (visible to every feature module) while the
 * Glance-backed implementation lives in `:app`, keeping the heavy Glance dependency
 * out of feature/core modules. Mirrors the iOS `WidgetSyncing` protocol boundary.
 *
 * Contract:
 *  - [refreshAll] is **auth-gated**: a no-op when signed out, so a logged-out process
 *    never re-renders widgets that would surface another tenant's rows.
 *  - [refreshAllUnconditional] refreshes regardless of auth state — used after
 *    `LocalCacheManager.clearAll()` on logout so widgets re-render their empty /
 *    signed-out state instead of showing stale cached rows.
 *  - [saveKpiSnapshot] persists the server-authoritative [DashboardKPIs] so the widget
 *    shows `netSalesThisMonth` instead of a divergent client-side sum (issue #828), then
 *    refreshes. Auth-gated.
 *  - [clearKpiSnapshot] removes the snapshot on logout so the widget doesn't show stale
 *    KPIs.
 *  - All methods are best-effort and never throw: failures are swallowed and logged by
 *    the implementation (parity with iOS REQ-WDS-06).
 */
interface WidgetSyncTrigger {

    /**
     * Refreshes every placed widget, auth-gated. Safe to call from any thread.
     */
    fun refreshAll()

    /**
     * Refreshes every placed widget regardless of auth state. Use after cache wipes
     * (logout) so widgets don't show stale data. Safe to call from any thread.
     */
    fun refreshAllUnconditional()

    /**
     * Persists [kpis] as the server-authoritative KPI snapshot for the widget, then
     * refreshes widgets. The widget prefers `kpis.netSalesThisMonth` over any client-side
     * derivation (parity with iOS WidgetSyncCoordinator / issue #828). Auth-gated.
     */
    fun saveKpiSnapshot(kpis: DashboardKPIs)

    /**
     * Removes the persisted KPI snapshot. Called on logout alongside
     * [refreshAllUnconditional] so the widget doesn't render stale server KPIs.
     */
    fun clearKpiSnapshot()
}

