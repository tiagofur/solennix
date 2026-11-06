import Foundation
import SolennixCore

// MARK: - Staff Limits

/// Typed helpers for the staff seat quota endpoint (issue #1366, parity with
/// web's proactive seat badge and creation block).
extension APIClient {
    /// `GET /api/staff/limits` — current seat usage and plan capacity.
    public func fetchStaffLimits() async throws -> StaffLimits {
        try await get(Endpoint.staffLimits)
    }
}
