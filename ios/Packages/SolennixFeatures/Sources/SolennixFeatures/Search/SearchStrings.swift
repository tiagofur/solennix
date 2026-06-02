import Foundation

enum SearchStrings {
    static var title: String { FeatureL10n.text("search.title", "Buscar") }
    static var placeholder: String { FeatureL10n.text("search.placeholder", "Clientes, eventos, productos...") }
    static var loading: String { FeatureL10n.text("search.loading", "Buscando...") }
    static var noResultsTitle: String { FeatureL10n.text("search.no_results.title", "Sin resultados") }
    static var noResultsSubtitle: String { FeatureL10n.text("search.no_results.subtitle", "Intenta con otro término de búsqueda") }
    static var initialStateHint: String { FeatureL10n.text("search.initial_state.hint", "Busca clientes, eventos, productos o inventario") }
    static var suggestionsTitle: String { FeatureL10n.text("search.suggestions.title", "Sugerencias") }
    static var suggestionsClear: String { FeatureL10n.text("search.suggestions.clear", "Limpiar") }
    static var resultsClients: String { FeatureL10n.text("search.results.clients", "Clientes") }
    static var resultsEvents: String { FeatureL10n.text("search.results.events", "Eventos") }
    static var resultsProducts: String { FeatureL10n.text("search.results.products", "Productos") }
    static var resultsInventory: String { FeatureL10n.text("search.results.inventory", "Inventario") }
    
    static func more(_ count: Int) -> String {
        FeatureL10n.format("search.results.more", "+ %lld más", count)
    }
}
