import XCTest
@testable import SolennixFeatures

// MARK: - Search Localization Tests

/// Resolution smoke tests (B-1, system-locale resolution). See the contract in
/// `AuthLocalizationTests`; these tests assert the EXPECTED value for the
/// simulator's current system locale (no runtime override — retired in B-1).
final class SearchLocalizationTests: XCTestCase {

    private func expected(spanish: String, english: String) -> String {
        FeatureL10n.languageCode == "en" ? english : spanish
    }

    // MARK: - General Tests

    func testSearchTitle_Resolves() {
        XCTAssertEqual(SearchStrings.title, expected(spanish: "Buscar", english: "Search"))
    }

    func testSearchPlaceholder_Resolves() {
        XCTAssertEqual(SearchStrings.placeholder, expected(spanish: "Clientes, eventos, productos...", english: "Clients, events, products..."))
    }

    func testSearchLoading_Resolves() {
        XCTAssertEqual(SearchStrings.loading, expected(spanish: "Buscando...", english: "Searching..."))
    }

    func testSearchNoResultsTitle_Resolves() {
        XCTAssertEqual(SearchStrings.noResultsTitle, expected(spanish: "Sin resultados", english: "No results"))
    }

    func testSearchNoResultsSubtitle_Resolves() {
        XCTAssertEqual(SearchStrings.noResultsSubtitle, expected(spanish: "Intenta con otro término de búsqueda", english: "Try with another search term"))
    }

    func testSearchInitialStateHint_Resolves() {
        XCTAssertEqual(
            SearchStrings.initialStateHint,
            expected(
                spanish: "Busca clientes, eventos, productos o inventario",
                english: "Search for clients, events, products or inventory"
            )
        )
    }

    // MARK: - Suggestions Tests

    func testSearchSuggestionsTitle_Resolves() {
        XCTAssertEqual(SearchStrings.suggestionsTitle, expected(spanish: "Sugerencias", english: "Suggestions"))
    }

    func testSearchSuggestionsClear_Resolves() {
        XCTAssertEqual(SearchStrings.suggestionsClear, expected(spanish: "Limpiar", english: "Clear"))
    }

    // MARK: - Results Formatted Tests

    func testSearchResultsMore_Resolves() {
        XCTAssertEqual(SearchStrings.more(3), expected(spanish: "+3 más", english: "+3 more"))
    }
}
