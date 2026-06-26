import Foundation

// MARK: - DateDay

/// Represents a single day cell in the calendar grid.
/// Moved from CalendarViewModel in Phase 6.
public struct DateDay: Identifiable, Hashable {
    public let id = UUID()
    public let date: Date
    public let dayNumber: Int
    public let isCurrentMonth: Bool
    public let isToday: Bool
    public let isSelected: Bool
}

// MARK: - CalendarError

/// Typed error surface for calendar operations (block/unblock/load).
/// The view maps each case to a localized string from `CalendarStrings`.
/// Moved from CalendarViewModel in Phase 6.
public enum CalendarError: Sendable, Equatable {
    case loadFailed
    case blockFailed
    case unblockFailed
}
