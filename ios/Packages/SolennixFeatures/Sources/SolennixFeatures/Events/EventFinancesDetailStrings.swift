import Foundation

enum EventFinancesDetailStrings {
    static var loading: String { FeatureL10n.text("event_finances.loading", "Cargando...") }
    static var errorTitle: String { FeatureL10n.text("event_finances.error_title", "Error") }
    static var errorMessage: String { FeatureL10n.text("event_finances.error_message", "No se pudo cargar") }
    static var navigationTitle: String { FeatureL10n.text("event_finances.navigation_title", "Finanzas") }
    static var totalCharged: String { FeatureL10n.text("event_finances.total_charged", "TOTAL COBRADO") }
    static var grossSale: String { FeatureL10n.text("event_finances.gross_sale", "Venta Bruta") }
    static var totalChargedRow: String { FeatureL10n.text("event_finances.total_charged_row", "Total Cobrado") }
    static var costs: String { FeatureL10n.text("event_finances.costs", "Costos") }
    static var netProfit: String { FeatureL10n.text("event_finances.net_profit", "Utilidad Neta") }
    static var margin: String { FeatureL10n.text("event_finances.margin", "Margen") }
    static var paid: String { FeatureL10n.text("event_finances.paid", "Pagado") }
    static var pending: String { FeatureL10n.text("event_finances.pending", "Pendiente") }
    static var collectionProgress: String { FeatureL10n.text("event_finances.collection_progress", "Progreso de Cobro") }

    static func iva(_ rate: Int) -> String {
        FeatureL10n.format("event_finances.iva", "IVA (%d%%)", rate)
    }

    static func deposit(_ percent: Int) -> String {
        FeatureL10n.format("event_finances.deposit", "Anticipo (%d%%)", percent)
    }

    static func discount(_ percent: Int) -> String {
        FeatureL10n.format("event_finances.discount_percent", "Descuento (%d%%)", percent)
    }

    static var discountFixed: String { FeatureL10n.text("event_finances.discount_fixed", "Descuento") }
    static var editAccessibility: String { FeatureL10n.text("event_finances.edit_a11y", "Editar finanzas") }
}
