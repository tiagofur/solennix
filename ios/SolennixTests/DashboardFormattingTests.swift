import XCTest
@testable import SolennixFeatures

// MARK: - DashboardFormatting MXN Pin Tests
//
// WU2 (ios-system-language) invariant: the business charges in MXN, so currency
// formatters MUST be pinned to the business locale (es_MX) regardless of the
// device/system locale. After WU1 made FeatureL10n.locale region-aware, the old
// default `locale: Locale = FeatureL10n.locale` made currency follow the system
// locale (es-AR -> "$1.000" grouping, en-US -> "$1,000.00") — wrong for a business
// that always charges in pesos.
//
// "A device in es-AR sees MXN" is partly a manual-device check (the system locale
// cannot be flipped in-process), but the observable deterministic consequence IS
// testable: the DEFAULT output must equal an independently-built es_MX formatter.
// These tests are environment-dependent — they go RED only when the system locale
// differs from es_MX. The CI simulator is `es` (dot grouping), so it differs and
// the pre-pin code is RED there; they are GREEN after the pin.

final class DashboardFormattingTests: XCTestCase {

    // MARK: - MXN Pinning (RED -> GREEN for WU2)

    /// currencyMXN's default locale MUST be the business es_MX locale, NOT
    /// FeatureL10n.locale. Against the pre-WU2 code (default = FeatureL10n.locale,
    /// i.e. the system locale) this fails whenever the system locale's currency
    /// grouping differs from es_MX — e.g. the `es` simulator yields dot-grouped
    /// "$1.234" while the pinned es_MX yields comma-grouped "$1,234".
    func testCurrencyMXN_defaultIsPinnedToBusinessEsMX() {
        let expected = NumberFormatter()
        expected.numberStyle = .currency
        expected.currencyCode = "MXN"
        expected.locale = Locale(identifier: "es_MX")
        expected.maximumFractionDigits = 0

        for amount in [0.0, 1.0, 999.0, 1234.0, 1_000_000.0] {
            let want = expected.string(from: NSNumber(value: amount))!
            let got = DashboardFormatting.currencyMXN(amount)
            XCTAssertEqual(got, want,
                           "amount \(amount): default must be pinned to es_MX (business currency), not FeatureL10n.locale")
        }
    }

    /// Triangulation across the compact variant: its default must also be pinned
    /// to es_MX so the symbol + compact grouping never follow the device locale.
    func testCompactCurrencyMXN_defaultIsPinnedToBusinessEsMX() {
        for amount in [1_500.0, 1_500_000.0] {
            let byDefault = DashboardFormatting.compactCurrencyMXN(amount)
            let explicitEsMX = DashboardFormatting.compactCurrencyMXN(amount, locale: Locale(identifier: "es_MX"))
            XCTAssertEqual(byDefault, explicitEsMX,
                           "amount \(amount): compact currency default must be pinned to es_MX, not FeatureL10n.locale")
        }
    }
}
