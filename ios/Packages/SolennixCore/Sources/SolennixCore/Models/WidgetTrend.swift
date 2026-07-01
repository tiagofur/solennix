import Foundation

/// Optional revenue-trend seam for KPI widgets (decision #3134 / D1).
///
/// The backend's `DashboardKPIs` does not yet carry a trend, so widgets ship a
/// NEUTRAL default (`revenueTrend == nil` → no arrow / "—"). This type is the
/// stable seam a future backend change wires into with no UI churn: the app
/// encodes it here and the widget extension decodes the same shape.
///
/// Lives in SolennixCore (shared) so both the app (`WidgetKPIData`) and the
/// widget extension (`WidgetKPIs`) reference one definition (DRY) — mirroring
/// how `WidgetAuthState` is shared across the process boundary.
public struct WidgetTrend: Codable, Hashable, Sendable {
    public enum Direction: String, Codable, Sendable {
        case up
        case down
        case flat
    }

    /// Trend direction (drives the arrow glyph + color).
    public let direction: Direction
    /// Magnitude as a percentage (e.g. `12` renders "+12%").
    public let percentage: Double

    public init(direction: Direction, percentage: Double) {
        self.direction = direction
        self.percentage = percentage
    }
}
