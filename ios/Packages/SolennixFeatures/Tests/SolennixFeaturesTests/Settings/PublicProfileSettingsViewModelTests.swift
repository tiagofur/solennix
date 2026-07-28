import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

final class PublicProfileSettingsViewModelTests: XCTestCase {

    private func makeVM() -> PublicProfileSettingsViewModel {
        PublicProfileSettingsViewModel(apiClient: APIClient())
    }

    // MARK: - Slug validation

    func testValidateSlugAcceptsValidKebabCase() {
        let vm = makeVM()
        XCTAssertNil(vm.validateSlug("mi-negocio"))
        XCTAssertNil(vm.validateSlug("abc"))
        XCTAssertNil(vm.validateSlug("a1-b2-c3"))
    }

    func testValidateSlugRejectsInvalidFormat() {
        let vm = makeVM()
        XCTAssertNotNil(vm.validateSlug("Mi-Negocio")) // uppercase
        XCTAssertNotNil(vm.validateSlug("-leading"))
        XCTAssertNotNil(vm.validateSlug("trailing-"))
        XCTAssertNotNil(vm.validateSlug("has spaces"))
        XCTAssertNotNil(vm.validateSlug("under_score"))
        XCTAssertNotNil(vm.validateSlug("ab")) // too short
    }

    func testValidateSlugAllowsEmpty() {
        let vm = makeVM()
        XCTAssertNil(vm.validateSlug(""))
        XCTAssertNil(vm.validateSlug("   "))
    }

    // MARK: - Socials parsing

    func testParseSocialsSplitsKeyValuePairs() {
        let result = PublicProfileSettingsViewModel.parseSocials(
            "instagram=@x, twitter=@y, site=https://ex.com"
        )
        XCTAssertEqual(result["instagram"], "@x")
        XCTAssertEqual(result["twitter"], "@y")
        XCTAssertEqual(result["site"], "https://ex.com")
    }

    func testParseSocialsEmptyReturnsEmptyDict() {
        XCTAssertEqual(PublicProfileSettingsViewModel.parseSocials(""), [:])
        XCTAssertEqual(PublicProfileSettingsViewModel.parseSocials("   "), [:])
    }

    // MARK: - Share URL

    func testShareURLUsesWebBaseNotAPIHost() {
        let vm = makeVM()
        vm.slug = "mi-negocio"
        XCTAssertEqual(vm.shareURL, "https://solennix.com/u/mi-negocio")
        XCTAssertFalse(vm.shareURL?.contains("api.") ?? true)
    }

    func testShareURLNilWhenSlugEmpty() {
        let vm = makeVM()
        vm.slug = ""
        XCTAssertNil(vm.shareURL)
    }

    // MARK: - Free plan forces Pro toggles off on save body prep

    func testIsPaidFalseWhenUserNilOrBasic() {
        let vm = makeVM()
        XCTAssertFalse(vm.isPaid)

        vm.user = User(
            id: "u1",
            email: "a@b.com",
            name: "A",
            plan: .basic,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z"
        )
        XCTAssertFalse(vm.isPaid)

        vm.user = User(
            id: "u1",
            email: "a@b.com",
            name: "A",
            plan: .pro,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z"
        )
        XCTAssertTrue(vm.isPaid)
    }

    // MARK: - SolennixURLs

    func testPublicProfileURLConstant() {
        XCTAssertEqual(SolennixURLs.webBaseURL, "https://solennix.com")
        XCTAssertEqual(SolennixURLs.publicProfileURL(slug: "x"), "https://solennix.com/u/x")
    }
}
