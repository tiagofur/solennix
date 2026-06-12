import Foundation

// MARK: - Date Formatting Extensions

extension Date {

    public static let mexicanLocale = Locale(identifier: "es_MX")
    /// Mexico City timezone used for formatting timestamps that carry business-time
    /// semantics (e.g. payment timestamps recorded in MX local time). Do NOT use
    /// this for parsing `yyyy-MM-dd` server dates — those are wall-clock calendar
    /// dates and must be parsed in UTC. See `fromServerDay`.
    public static let mexicanTimeZone = TimeZone(secondsFromGMT: -21600) ?? TimeZone(identifier: "America/Mexico_City")!

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

    // MARK: - Server day parse formatter (UTC)

    /// Parses `yyyy-MM-dd` server strings. Pinned to UTC so that date math
    /// (sorting, comparisons, range bucketing between server dates) is stable
    /// regardless of the device's local timezone. DISPLAY formatters that
    /// consume the resulting `Date` must also use UTC to avoid a day shift —
    /// see `formatted(style:)` note below and `DashboardFormatting`.
    private static let serverDayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        // POLICY: yyyy-MM-dd strings are wall-clock calendar dates with no
        // timezone component. We pin to UTC so internal Date arithmetic is
        // stable. Any formatter that displays these Dates for the user must
        // ALSO use UTC to preserve the calendar day. The sole exception is
        // `isServerDayToday`, which intentionally uses device-local time —
        // see its doc comment.
        f.timeZone = TimeZone(secondsFromGMT: 0)
        return f
    }()

    /// Parses a `yyyy-MM-dd` string (optionally with a trailing time component)
    /// into a `Date` anchored at midnight UTC on that calendar day.
    ///
    /// **Parse/display contract**: because parsing is UTC, every formatter that
    /// turns the resulting `Date` back into a visible day string must also use
    /// UTC. Mismatching (parsing UTC, displaying in local/MX time) causes a
    /// one-day shift for users west of UTC. `DashboardFormatting` helpers and
    /// `EventDetailView.formatDateShort` already follow this contract.
    public static func fromServerDay(_ dateString: String) -> Date? {
        serverDayFormatter.date(from: String(dateString.prefix(10)))
    }

    // MARK: - Server day display formatter (UTC — must match parse timezone)

    /// UTC formatter for rendering a `Date` that was produced by `fromServerDay`
    /// back into a `yyyy-MM-dd` string or any date-only display. Using UTC here
    /// keeps the round-trip `parse → format` lossless regardless of device timezone.
    public static let utcDayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(secondsFromGMT: 0)
        return f
    }()

    // MARK: - UTC display helper for server-day Dates

    /// NSCache of UTC DateFormatter instances keyed by "<format>|<locale>".
    private static let utcFormatterCache: NSCache<NSString, DateFormatter> = {
        let cache = NSCache<NSString, DateFormatter>()
        cache.countLimit = 32
        return cache
    }()

    /// Formats a `Date` produced by `fromServerDay` using UTC so the displayed
    /// calendar day matches the original `yyyy-MM-dd` server string.
    ///
    /// Use this (not `formatted(style:)`) for all date-only display of server
    /// dates. `formatted(style:)` uses `mexicanTimeZone`, which would shift the
    /// displayed day by the UTC offset for users in negative-offset zones.
    public func formattedServerDay(style: String, locale: Locale = Date.mexicanLocale) -> String {
        let cacheKey = "\(style)|\(locale.identifier)" as NSString
        if let cached = Self.utcFormatterCache.object(forKey: cacheKey) {
            return cached.string(from: self)
        }
        let f = DateFormatter()
        f.locale = locale
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.dateFormat = style
        Self.utcFormatterCache.setObject(f, forKey: cacheKey)
        return f.string(from: self)
    }

    /// Formats a `Date` produced by `fromServerDay` using a localized template
    /// (e.g. `"dMMMyyyy"`) in UTC. Safe replacement for `setLocalizedDateFormatFromTemplate`
    /// calls that follow `fromServerDay` parsing.
    public func formattedServerDayTemplate(_ template: String, locale: Locale = Date.mexicanLocale) -> String {
        let f = DateFormatter()
        f.locale = locale
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.setLocalizedDateFormatFromTemplate(template)
        return f.string(from: self)
    }

    // MARK: - "Is today?" helper (device-local — intentional)

    /// Returns today's date string in the device's local timezone.
    ///
    /// **Why local?** An event dated `2026-06-15` is "today" when the USER's
    /// calendar (device timezone) reads June 15. We intentionally do NOT use UTC
    /// here. String-compare against the raw `yyyy-MM-dd` server value — no
    /// `Date` round-trip needed.
    public static func localTodayString() -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        // No explicit timeZone assignment → uses device local timezone (intentional).
        return f.string(from: Date())
    }

    /// Returns `true` when `serverDay` (a `yyyy-MM-dd` string from the backend)
    /// falls on today in the user's local timezone.
    ///
    /// Correct semantics: an event dated `2026-06-15` is "today" whenever the
    /// device's local calendar says June 15, regardless of UTC offset. We compare
    /// the raw server string against today's local date string — no `Date`
    /// round-trip, no timezone conversion.
    public static func isServerDayToday(_ serverDay: String) -> Bool {
        String(serverDay.prefix(10)) == localTodayString()
    }
}
