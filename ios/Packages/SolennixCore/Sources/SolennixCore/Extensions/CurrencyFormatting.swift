import Foundation

// MARK: - Double Currency Formatting

extension Double {

    private static let mxnFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "es_MX")
        formatter.currencyCode = "MXN"
        formatter.currencySymbol = "$"
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 2
        return formatter
    }()

    /// Formats as MXN currency: "$1,234.56 MXN"
    public var asMXN: String {
        let formatted = Self.mxnFormatter.string(from: NSNumber(value: self)) ?? "$0.00"
        return "\(formatted) MXN"
    }

    /// Formats with dynamic currency code using locale-specific rules.
    public func formattedCurrency(code: String?) -> String {
        let currencyCode = code ?? "MXN"
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "es_MX")
        formatter.currencyCode = currencyCode
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 2
        
        let formatted = formatter.string(from: NSNumber(value: self)) ?? "$0.00"
        if currencyCode == "MXN" {
            return formatted
        }
        return "\(formatted) \(currencyCode)"
    }
}

// MARK: - Decimal Currency Formatting

extension Decimal {

    private static let mxnFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "es_MX")
        formatter.currencyCode = "MXN"
        formatter.currencySymbol = "$"
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 2
        return formatter
    }()

    /// Formats as MXN currency: "$1,234.56 MXN"
    public var asMXN: String {
        let formatted = Self.mxnFormatter.string(from: self as NSDecimalNumber) ?? "$0.00"
        return "\(formatted) MXN"
    }

    /// Formats with dynamic currency code using locale-specific rules.
    public func formattedCurrency(code: String?) -> String {
        let currencyCode = code ?? "MXN"
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "es_MX")
        formatter.currencyCode = currencyCode
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 2
        
        let formatted = formatter.string(from: self as NSDecimalNumber) ?? "$0.00"
        if currencyCode == "MXN" {
            return formatted
        }
        return "\(formatted) \(currencyCode)"
    }
}
