import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

final class BusinessSettingsViewModelTests: XCTestCase {

    private func makeUser(plan: Plan) -> User {
        User(
            id: "user-1",
            email: "test@example.com",
            name: "Test User",
            role: "owner",
            preferredLanguage: "es",
            businessName: "Test Business",
            logoUrl: nil,
            brandColor: "#C4A265",
            showBusinessNameInPdf: true,
            defaultDepositPercent: 50,
            defaultCancellationDays: 7,
            defaultRefundPercent: 50,
            contractTemplate: "Template content",
            emailPaymentReceipt: true,
            emailEventReminder: true,
            emailSubscriptionUpdates: true,
            emailWeeklySummary: true,
            emailMarketing: false,
            pushEnabled: true,
            pushEventReminder: true,
            pushPaymentReceived: true,
            plan: plan,
            planExpiresAt: nil,
            accountStatus: "active",
            createdAt: "2026-06-24T00:00:00Z",
            updatedAt: "2026-06-24T00:00:00Z"
        )
    }

    func testBrandingCustomizationGatesBasedOnPlan() {
        let apiClient = APIClient()
        let vm = BusinessSettingsViewModel(apiClient: apiClient)

        // 1. Nil user defaults to false
        vm.user = nil
        XCTAssertFalse(vm.canCustomizeBranding)

        // 2. Basic plan user cannot customize branding
        vm.user = makeUser(plan: .basic)
        XCTAssertFalse(vm.canCustomizeBranding)

        // 3. Pro plan user can customize branding
        vm.user = makeUser(plan: .pro)
        XCTAssertTrue(vm.canCustomizeBranding)

        // 4. Business plan user can customize branding
        vm.user = makeUser(plan: .business)
        XCTAssertTrue(vm.canCustomizeBranding)

        // 5. Premium plan user can customize branding
        vm.user = makeUser(plan: .premium)
        XCTAssertTrue(vm.canCustomizeBranding)
    }

    func testContractTemplateCustomizationGatesBasedOnPlan() {
        let apiClient = APIClient()
        let vm = BusinessSettingsViewModel(apiClient: apiClient)

        // 1. Nil user defaults to false
        vm.user = nil
        XCTAssertFalse(vm.canCustomizeContractTemplate)

        // 2. Basic plan user cannot customize contract template
        vm.user = makeUser(plan: .basic)
        XCTAssertFalse(vm.canCustomizeContractTemplate)

        // 3. Pro plan user can customize contract template
        vm.user = makeUser(plan: .pro)
        XCTAssertTrue(vm.canCustomizeContractTemplate)

        // 4. Business plan user can customize contract template
        vm.user = makeUser(plan: .business)
        XCTAssertTrue(vm.canCustomizeContractTemplate)

        // 5. Premium plan user can customize contract template
        vm.user = makeUser(plan: .premium)
        XCTAssertTrue(vm.canCustomizeContractTemplate)
    }
}
