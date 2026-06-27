import Foundation
import SolennixCore

enum DashboardFormatting {
    private static let posixMonthFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM"
        return formatter
    }()

    // NumberFormatter is expensive to create — cache per locale to avoid
    // re-allocating on every cell render (30+ calls per dashboard render cycle).
    // NSCache is thread-safe; plain Dictionary is not — callers can come from
    // ViewModel background tasks as well as View body (MainActor) reads.
    //
    // CURRENCY is pinned to the business locale es_MX (the business always charges
    // in MXN) — see currencyMXN/compactCurrencyMXN defaults below. DATE helpers
    // below remain on the system locale (FeatureL10n.locale) so dates correctly
    // follow the device language/region.
    private static let currencyFormatterCache: NSCache<NSString, NumberFormatter> = NSCache()

    private static func currencyFormatter(locale: Locale) -> NumberFormatter {
        let key = locale.identifier as NSString
        if let cached = currencyFormatterCache.object(forKey: key) {
            return cached
        }
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "MXN"
        formatter.locale = locale
        formatter.maximumFractionDigits = 0
        currencyFormatterCache.setObject(formatter, forKey: key)
        return formatter
    }

    // Default locale is the business es_MX (NOT FeatureL10n.locale) so the
    // currency code/symbol/grouping stay MXN regardless of the device locale
    // (es-AR device -> MXN, en-US device -> MXN). Matches CommonFormatting.currencyMXN.
    static func currencyMXN(_ amount: Double, locale: Locale = Locale(identifier: "es_MX")) -> String {
        currencyFormatter(locale: locale).string(from: NSNumber(value: amount))
            ?? amount.formatted(.currency(code: "MXN").locale(locale).precision(.fractionLength(0)))
    }

    static func compactCurrencyMXN(_ amount: Double, locale: Locale = Locale(identifier: "es_MX")) -> String {
        let symbol = currencyFormatter(locale: locale).currencySymbol ?? "$"
        let compactNumber = amount.formatted(
            .number
                .locale(locale)
                .notation(.compactName)
                .precision(.fractionLength(0))
        )
        return "\(symbol)\(compactNumber)"
    }

    static func greetingDate(_ date: Date = Date(), locale: Locale = FeatureL10n.locale) -> String {
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.setLocalizedDateFormatFromTemplate("EEEE d MMMM")
        let value = formatter.string(from: date)
        return value.prefix(1).uppercased() + value.dropFirst()
    }

    static func monthDayComponents(from serverDay: String, locale: Locale = FeatureL10n.locale) -> (month: String, day: String) {
        guard let date = Date.fromServerDay(serverDay) else {
            return ("---", "--")
        }

        // Use UTC formatters — parse/display timezone must match fromServerDay (UTC)
        // to avoid a one-day shift for users in negative-offset zones.
        return (
            date.formattedServerDayTemplate("MMM", locale: locale).uppercased(),
            date.formattedServerDayTemplate("d", locale: locale)
        )
    }

    static func compactDate(from serverDay: String, locale: Locale = FeatureL10n.locale) -> String {
        guard let date = Date.fromServerDay(serverDay) else {
            return String(serverDay.prefix(10))
        }

        // Use UTC formatter — parse/display timezone must match fromServerDay (UTC).
        return date.formattedServerDayTemplate("dMMM", locale: locale)
    }

    static func monthYear(from yearMonth: String, locale: Locale = FeatureL10n.locale) -> String {
        guard let date = posixMonthFormatter.date(from: yearMonth) else {
            return yearMonth
        }

        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.setLocalizedDateFormatFromTemplate("MMM yyyy")
        return formatter.string(from: date).capitalized(with: locale)
    }
}
