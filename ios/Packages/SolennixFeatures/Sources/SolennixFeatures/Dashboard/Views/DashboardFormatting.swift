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

    private static func currencyFormatter(locale: Locale) -> NumberFormatter {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "MXN"
        formatter.locale = locale
        formatter.maximumFractionDigits = 0
        return formatter
    }

    static func currencyMXN(_ amount: Double, locale: Locale = FeatureL10n.locale) -> String {
        currencyFormatter(locale: locale).string(from: NSNumber(value: amount))
            ?? amount.formatted(.currency(code: "MXN").locale(locale).precision(.fractionLength(0)))
    }

    static func compactCurrencyMXN(_ amount: Double, locale: Locale = FeatureL10n.locale) -> String {
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
