import Foundation

/// Staff seat quota for the current organizer, from `GET /api/staff/limits`.
/// Mirrors the backend `StaffLimitsResponse` (issue #1366, parity with web).
public struct StaffLimits: Codable, Sendable, Equatable {
    public let used: Int
    /// Seat capacity; `nil` when the plan is unlimited.
    public let max: Int?
    public let unlimited: Bool
    public let plan: String

    public init(used: Int, max: Int?, unlimited: Bool, plan: String) {
        self.used = used
        self.max = max
        self.unlimited = unlimited
        self.plan = plan
    }
}
