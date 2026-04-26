import Foundation

// MARK: - Date Formatting Extensions

extension Date {

    public static let mexicanLocale = Locale(identifier: "es_MX")
    public static let mexicanTimeZone = TimeZone(identifier: "America/Mexico_City")!

    // MARK: - ISO 8601 Parsing

    private static let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let isoFormatterNoFraction: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    /// Parse an ISO 8601 date string (with or without fractional seconds).
    public static func from(isoString: String) -> Date? {
        isoFormatter.date(from: isoString)
            ?? isoFormatterNoFraction.date(from: isoString)
    }

    // MARK: - Short Date (e.g., "17 mar 2026")

    private static let shortDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = mexicanLocale
        formatter.timeZone = mexicanTimeZone
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()

    /// Formats as short date: "17 mar 2026"
    public var shortDate: String {
        Self.shortDateFormatter.string(from: self)
    }

    // MARK: - Long Date (e.g., "martes, 17 de marzo de 2026")

    private static let longDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = mexicanLocale
        formatter.timeZone = mexicanTimeZone
        formatter.dateStyle = .full
        formatter.timeStyle = .none
        return formatter
    }()

    /// Formats as long date: "martes, 17 de marzo de 2026"
    public var longDate: String {
        Self.longDateFormatter.string(from: self)
    }

    // MARK: - Time Only (e.g., "14:30")

    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = mexicanLocale
        formatter.timeZone = mexicanTimeZone
        formatter.dateStyle = .none
        formatter.timeStyle = .short
        return formatter
    }()

    /// Formats as time only: "14:30"
    public var timeOnly: String {
        Self.timeFormatter.string(from: self)
    }

    // MARK: - Custom Format

    /// Cache of DateFormatter instances keyed by format string. SwiftUI view
    /// helpers hit `formatted(style:)` on every `body` evaluation; without
    /// caching each call allocates a new `DateFormatter`, which is measurable
    /// on devices when the dashboard or event detail renders.
    ///
    /// NSCache is thread-safe for read/write; DateFormatter itself is safe
    /// to READ concurrently (we never mutate an already-cached formatter).
    private static let formatterCache: NSCache<NSString, DateFormatter> = {
        let cache = NSCache<NSString, DateFormatter>()
        cache.countLimit = 32
        return cache
    }()

    /// Returns (or creates) a cached DateFormatter configured with the given
    /// format string, es_MX locale and America/Mexico_City timezone.
    public static func cachedFormatter(style: String) -> DateFormatter {
        let key = style as NSString
        if let cached = formatterCache.object(forKey: key) {
            return cached
        }
        let formatter = DateFormatter()
        formatter.locale = mexicanLocale
        formatter.timeZone = mexicanTimeZone
        formatter.dateFormat = style
        formatterCache.setObject(formatter, forKey: key)
        return formatter
    }

    /// Formats the date using a custom format string with es_MX locale.
    /// Backed by an internal cache — reuse instead of allocating a new
    /// `DateFormatter` for repeated calls with the same format string.
    public func formatted(style: String) -> String {
        Self.cachedFormatter(style: style).string(from: self)
    }

    // MARK: - Server date parsing (yyyy-MM-dd)

    private static let serverDayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        // Server dates are wall-clock dates (no time component). Parse them
        // in Mexican timezone to keep them stable.
        f.timeZone = mexicanTimeZone
        return f
    }()

    /// Parses a `yyyy-MM-dd` string (optionally with trailing time) into a
    /// `Date`. Server dates are treated as UTC so they do not shift by a day
    /// on devices in negative-offset timezones.
    public static func fromServerDay(_ dateString: String) -> Date? {
        serverDayFormatter.date(from: String(dateString.prefix(10)))
    }
}
