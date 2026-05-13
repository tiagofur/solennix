import XCTest
import Foundation
import SolennixCore

final class SubscriptionStatusTests: XCTestCase {

    func testProviderFallbackBadgeStringsAreStable() {
        XCTAssertEqual(SubscriptionProvider.stripe.fallbackBadge, "Suscrito vía Web")
        XCTAssertEqual(SubscriptionProvider.apple.fallbackBadge, "Suscrito vía App Store")
        XCTAssertEqual(SubscriptionProvider.google.fallbackBadge, "Suscrito vía Google Play")
    }

    func testProviderFallbackCancelInstructionsContainChannelHints() {
        XCTAssertTrue(SubscriptionProvider.stripe.fallbackCancelInstructions.contains("solennix.com"))
        XCTAssertTrue(SubscriptionProvider.apple.fallbackCancelInstructions.contains("Apple ID"))
        XCTAssertTrue(SubscriptionProvider.google.fallbackCancelInstructions.contains("Google Play"))
    }

    func testIsCurrentPlatformIsTrueOnlyForApple() {
        XCTAssertFalse(SubscriptionProvider.stripe.isCurrentPlatform)
        XCTAssertTrue(SubscriptionProvider.apple.isCurrentPlatform)
        XCTAssertFalse(SubscriptionProvider.google.isCurrentPlatform)
    }

    func testSubscriptionInfoInitKeepsAllFields() {
        let info = SubscriptionInfo(
            status: "active",
            provider: .stripe,
            sourceBadge: "Suscrito vía Web",
            cancelInstructions: "Cancelar desde web",
            currentPeriodEnd: "2026-12-31",
            cancelAtPeriodEnd: true,
            amountCents: 129900,
            currency: "MXN",
            billingInterval: "month"
        )

        XCTAssertEqual(info.status, "active")
        XCTAssertEqual(info.provider, .stripe)
        XCTAssertEqual(info.sourceBadge, "Suscrito vía Web")
        XCTAssertEqual(info.cancelInstructions, "Cancelar desde web")
        XCTAssertEqual(info.currentPeriodEnd, "2026-12-31")
        XCTAssertTrue(info.cancelAtPeriodEnd)
        XCTAssertEqual(info.amountCents, 129900)
        XCTAssertEqual(info.currency, "MXN")
        XCTAssertEqual(info.billingInterval, "month")
    }

    func testSubscriptionInfoInitDefaultsOptionalFields() {
        let info = SubscriptionInfo(
            status: "trialing",
            provider: .apple
        )

        XCTAssertEqual(info.status, "trialing")
        XCTAssertEqual(info.provider, .apple)
        XCTAssertNil(info.sourceBadge)
        XCTAssertNil(info.cancelInstructions)
        XCTAssertNil(info.currentPeriodEnd)
        XCTAssertFalse(info.cancelAtPeriodEnd)
        XCTAssertNil(info.amountCents)
        XCTAssertNil(info.currency)
        XCTAssertNil(info.billingInterval)
    }

    func testSubscriptionStatusResponseDecodesWithAndWithoutSubscription() throws {
        let withSubscription = """
        {
          "plan": "pro",
          "hasStripeAccount": true,
          "subscription": {
            "status": "active",
            "provider": "stripe",
            "sourceBadge": "Suscrito vía Web",
            "cancelInstructions": "Cancelar desde web",
            "currentPeriodEnd": "2026-12-31",
            "cancelAtPeriodEnd": false,
            "amountCents": 99900,
            "currency": "MXN",
            "billingInterval": "month"
          }
        }
        """.data(using: .utf8)!

        let withoutSubscription = """
        {
          "plan": "free",
          "hasStripeAccount": false,
          "subscription": null
        }
        """.data(using: .utf8)!

        let decodedWith = try JSONDecoder().decode(SubscriptionStatusResponse.self, from: withSubscription)
        let decodedWithout = try JSONDecoder().decode(SubscriptionStatusResponse.self, from: withoutSubscription)

        XCTAssertEqual(decodedWith.plan, "pro")
        XCTAssertTrue(decodedWith.hasStripeAccount)
        XCTAssertEqual(decodedWith.subscription?.provider, .stripe)
        XCTAssertEqual(decodedWith.subscription?.amountCents, 99900)

        XCTAssertEqual(decodedWithout.plan, "free")
        XCTAssertFalse(decodedWithout.hasStripeAccount)
        XCTAssertNil(decodedWithout.subscription)
    }

        func testSubscriptionStatusResponseDecodesAppleSubscriptionWithoutStripePricingFields() throws {
                let appleSubscription = """
                {
                    "plan": "business",
                    "hasStripeAccount": false,
                    "subscription": {
                        "status": "active",
                        "provider": "apple",
                        "sourceBadge": null,
                        "cancelInstructions": null,
                        "currentPeriodEnd": "2027-01-15",
                        "cancelAtPeriodEnd": true
                    }
                }
                """.data(using: .utf8)!

                let decoded = try JSONDecoder().decode(SubscriptionStatusResponse.self, from: appleSubscription)

                XCTAssertEqual(decoded.plan, "business")
                XCTAssertFalse(decoded.hasStripeAccount)
                XCTAssertEqual(decoded.subscription?.provider, .apple)
                XCTAssertEqual(decoded.subscription?.status, "active")
                XCTAssertEqual(decoded.subscription?.currentPeriodEnd, "2027-01-15")
                XCTAssertTrue(decoded.subscription?.cancelAtPeriodEnd ?? false)
                XCTAssertNil(decoded.subscription?.amountCents)
                XCTAssertNil(decoded.subscription?.currency)
                XCTAssertNil(decoded.subscription?.billingInterval)
        }
}
