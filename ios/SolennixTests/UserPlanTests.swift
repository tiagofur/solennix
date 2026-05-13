import XCTest
import Foundation
import SolennixCore

final class UserPlanTests: XCTestCase {

    func testPlanDecodingKeepsKnownCurrentValues() throws {
        let basic = try JSONDecoder().decode(Plan.self, from: Data("\"basic\"".utf8))
        let pro = try JSONDecoder().decode(Plan.self, from: Data("\"pro\"".utf8))
        let business = try JSONDecoder().decode(Plan.self, from: Data("\"business\"".utf8))

        XCTAssertEqual(basic, .basic)
        XCTAssertEqual(pro, .pro)
        XCTAssertEqual(business, .business)
    }

    func testPlanDecodingFallsBackToBasicForUnknownValue() throws {
        let decoded = try JSONDecoder().decode(Plan.self, from: Data("\"enterprise\"".utf8))

        XCTAssertEqual(decoded, .basic)
    }

    func testPlanDecodingKeepsLegacyPremiumValue() throws {
        let decoded = try JSONDecoder().decode(Plan.self, from: Data("\"premium\"".utf8))

        XCTAssertEqual(decoded, .premium)
    }

    func testPlanDecodingIsCaseSensitiveAndFallsBackToBasic() throws {
        let decoded = try JSONDecoder().decode(Plan.self, from: Data("\"PRO\"".utf8))

        XCTAssertEqual(decoded, .basic)
    }

    func testPlanIsPaidOnlyForPaidTiers() {
        XCTAssertFalse(Plan.basic.isPaid)
        XCTAssertTrue(Plan.pro.isPaid)
        XCTAssertTrue(Plan.business.isPaid)
        XCTAssertTrue(Plan.premium.isPaid)
    }

    func testUserDecodingFromSnakeCaseJSONMapsOptionalFields() throws {
        let json = """
        {
          "id": "u_1",
          "email": "ana@solennix.com",
          "name": "Ana",
          "preferred_language": "es",
          "business_name": "Eventos Ana",
          "logo_url": "https://cdn.solennix.com/logo.png",
          "brand_color": "#C4A265",
          "show_business_name_in_pdf": true,
          "default_deposit_percent": 30,
          "default_cancellation_days": 14,
          "default_refund_percent": 50,
          "contract_template": "base",
          "email_payment_receipt": true,
          "email_event_reminder": false,
          "email_subscription_updates": true,
          "email_weekly_summary": true,
          "email_marketing": false,
          "push_enabled": true,
          "push_event_reminder": true,
          "push_payment_received": false,
          "plan": "pro",
          "stripe_customer_id": "cus_123",
          "plan_expires_at": "2026-12-31T00:00:00Z",
          "created_at": "2026-01-01T00:00:00Z",
          "updated_at": "2026-01-02T00:00:00Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let user = try decoder.decode(User.self, from: json)

        XCTAssertEqual(user.id, "u_1")
        XCTAssertEqual(user.email, "ana@solennix.com")
        XCTAssertEqual(user.name, "Ana")
        XCTAssertEqual(user.preferredLanguage, "es")
        XCTAssertEqual(user.businessName, "Eventos Ana")
        XCTAssertEqual(user.logoUrl, "https://cdn.solennix.com/logo.png")
        XCTAssertEqual(user.brandColor, "#C4A265")
        XCTAssertEqual(user.showBusinessNameInPdf, true)
        XCTAssertEqual(user.defaultDepositPercent, 30)
        XCTAssertEqual(user.defaultCancellationDays, 14)
        XCTAssertEqual(user.defaultRefundPercent, 50)
        XCTAssertEqual(user.contractTemplate, "base")
        XCTAssertEqual(user.emailPaymentReceipt, true)
        XCTAssertEqual(user.emailEventReminder, false)
        XCTAssertEqual(user.emailSubscriptionUpdates, true)
        XCTAssertEqual(user.emailWeeklySummary, true)
        XCTAssertEqual(user.emailMarketing, false)
        XCTAssertEqual(user.pushEnabled, true)
        XCTAssertEqual(user.pushEventReminder, true)
        XCTAssertEqual(user.pushPaymentReceived, false)
        XCTAssertEqual(user.plan, .pro)
        XCTAssertEqual(user.stripeCustomerId, "cus_123")
        XCTAssertEqual(user.planExpiresAt, "2026-12-31T00:00:00Z")
        XCTAssertEqual(user.createdAt, "2026-01-01T00:00:00Z")
        XCTAssertEqual(user.updatedAt, "2026-01-02T00:00:00Z")
    }

    func testUserDecodingUnknownPlanFallsBackToBasic() throws {
        let json = """
        {
          "id": "u_2",
          "email": "basic@solennix.com",
          "name": "Basic User",
          "plan": "unknown_plan",
          "created_at": "2026-01-01T00:00:00Z",
          "updated_at": "2026-01-02T00:00:00Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let user = try decoder.decode(User.self, from: json)

        XCTAssertEqual(user.plan, .basic)
        XCTAssertNil(user.businessName)
        XCTAssertNil(user.stripeCustomerId)
        XCTAssertNil(user.planExpiresAt)
    }

    func testUserDecodingMinimalPayloadKeepsOptionalsNil() throws {
        let json = """
        {
          "id": "u_3",
          "email": "minimal@solennix.com",
          "name": "Minimal",
          "plan": "basic",
          "created_at": "2026-01-01T00:00:00Z",
          "updated_at": "2026-01-02T00:00:00Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let user = try decoder.decode(User.self, from: json)

        XCTAssertEqual(user.plan, .basic)
        XCTAssertNil(user.preferredLanguage)
        XCTAssertNil(user.businessName)
        XCTAssertNil(user.logoUrl)
        XCTAssertNil(user.brandColor)
        XCTAssertNil(user.showBusinessNameInPdf)
        XCTAssertNil(user.emailPaymentReceipt)
        XCTAssertNil(user.emailEventReminder)
        XCTAssertNil(user.emailSubscriptionUpdates)
        XCTAssertNil(user.emailWeeklySummary)
        XCTAssertNil(user.emailMarketing)
        XCTAssertNil(user.pushEnabled)
        XCTAssertNil(user.pushEventReminder)
        XCTAssertNil(user.pushPaymentReceived)
    }
}