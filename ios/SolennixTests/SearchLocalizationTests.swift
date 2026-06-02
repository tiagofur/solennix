import XCTest
@testable import SolennixFeatures

// MARK: - Search Localization Tests

final class SearchLocalizationTests: XCTestCase {

    override func tearDown() {
        super.tearDown()
        UserDefaults.standard.removeObject(forKey: "preferredLocale")
    }

    // MARK: - Helpers

    private func setLocale(_ identifier: String) {
        UserDefaults.standard.set(identifier, forKey: "preferredLocale")
    }

    // MARK: - General Tests

    func testSearchTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(SearchStrings.title, "Buscar")
    }

    func testSearchTitle_English() {
        setLocale("en")
        XCTAssertEqual(SearchStrings.title, "Search")
    }

    func testSearchPlaceholder_Spanish() {
        setLocale("es")
        XCTAssertEqual(SearchStrings.placeholder, "Clientes, eventos, productos...")
    }

    func testSearchPlaceholder_English() {
        setLocale("en")
        XCTAssertEqual(SearchStrings.placeholder, "Clients, events, products...")
    }

    func testSearchLoading_Spanish() {
        setLocale("es")
        XCTAssertEqual(SearchStrings.loading, "Buscando...")
    }

    func testSearchLoading_English() {
        setLocale("en")
        XCTAssertEqual(SearchStrings.loading, "Searching...")
    }

    func testSearchNoResultsTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(SearchStrings.noResultsTitle, "Sin resultados")
    }

    func testSearchNoResultsTitle_English() {
        setLocale("en")
        XCTAssertEqual(SearchStrings.noResultsTitle, "No results")
    }

    func testSearchNoResultsSubtitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(SearchStrings.noResultsSubtitle, "Intenta con otro término de búsqueda")
    }

    func testSearchNoResultsSubtitle_English() {
        setLocale("en")
        XCTAssertEqual(SearchStrings.noResultsSubtitle, "Try with another search term")
    }

    func testSearchInitialStateHint_Spanish() {
        setLocale("es")
        XCTAssertEqual(SearchStrings.initialStateHint, "Busca clientes, eventos, productos o inventario")
    }

    func testSearchInitialStateHint_English() {
        setLocale("en")
        XCTAssertEqual(SearchStrings.initialStateHint, "Search for clients, events, products or inventory")
    }

    // MARK: - Suggestions Tests

    func testSearchSuggestionsTitle_Spanish() {
        setLocale("es")
        XCTAssertEqual(SearchStrings.suggestionsTitle, "Sugerencias")
    }

    func testSearchSuggestionsTitle_English() {
        setLocale("en")
        XCTAssertEqual(SearchStrings.suggestionsTitle, "Suggestions")
    }

    func testSearchSuggestionsClear_Spanish() {
        setLocale("es")
        XCTAssertEqual(SearchStrings.suggestionsClear, "Limpiar")
    }

    func testSearchSuggestionsClear_English() {
        setLocale("en")
        XCTAssertEqual(SearchStrings.suggestionsClear, "Clear")
    }

    // MARK: - Results Formatted Tests

    func testSearchResultsMore_Spanish() {
        setLocale("es")
        XCTAssertEqual(SearchStrings.more(3), "+ 3 más")
    }

    func testSearchResultsMore_English() {
        setLocale("en")
        XCTAssertEqual(SearchStrings.more(3), "+ 3 more")
    }

    // MARK: - Dynamic Switching

    func testDynamicSwitching_SearchTitle() {
        setLocale("es")
        XCTAssertEqual(SearchStrings.title, "Buscar")
        setLocale("en")
        XCTAssertEqual(SearchStrings.title, "Search")
    }
}
