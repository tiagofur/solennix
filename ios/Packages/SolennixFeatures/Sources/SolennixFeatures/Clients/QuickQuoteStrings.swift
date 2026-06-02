import Foundation

enum QuickQuoteStrings {
    private static var isEnglish: Bool { FeatureL10n.languageCode == "en" }

    static var title: String { FeatureL10n.text("quick_quote.title", "Cotización Rápida") }
    static var compactTitle: String { FeatureL10n.text("quick_quote.compact_title", "Cotización rápida") }
    static var clientData: String { FeatureL10n.text("quick_quote.client_data", "Datos del cliente (opcional, para el PDF)") }
    static var clientName: String { FeatureL10n.text("quick_quote.client_name", "Nombre del cliente") }
    static var phone: String { FeatureL10n.text("quick_quote.phone", "Teléfono") }
    static var email: String { FeatureL10n.text("quick_quote.email", "Email") }
    static var basicData: String { FeatureL10n.text("quick_quote.basic_data", "Datos Básicos") }
    static var numPeople: String { FeatureL10n.text("quick_quote.num_people", "Número de Personas") }
    static var products: String { FeatureL10n.text("quick_quote.products", "Productos") }
    static var extras: String { FeatureL10n.text("quick_quote.extras", "Extras") }
    static var addProduct: String { FeatureL10n.text("quick_quote.add_product", "Agregar Producto") }
    static var addExtra: String { FeatureL10n.text("quick_quote.add_extra", "Agregar Extra") }
    static var discountBilling: String { FeatureL10n.text("quick_quote.discount_billing", "Descuento y Facturación") }
    static var invoiceRequired: String { FeatureL10n.text("quick_quote.invoice_required", "Requiere Factura (IVA)") }
    static var discountType: String { FeatureL10n.text("quick_quote.discount_type", "Tipo de Descuento") }
    static var percentDiscount: String { FeatureL10n.text("quick_quote.percent_discount", "Porcentaje (%)") }
    static var fixedDiscount: String { FeatureL10n.text("quick_quote.fixed_discount", "Monto Fijo ($)") }
    static var discount: String { FeatureL10n.text("quick_quote.discount", "Descuento") }
    static var summary: String { FeatureL10n.text("quick_quote.summary", "Resumen") }
    static var subtotalProducts: String { FeatureL10n.text("quick_quote.subtotal_products", "Subtotal Productos") }
    static var subtotalExtras: String { FeatureL10n.text("quick_quote.subtotal_extras", "Subtotal Extras") }
    static var vat: String { "IVA" }
    static var total: String { FeatureL10n.text("quick_quote.total", "Total") }
    static var profitabilityMetrics: String { FeatureL10n.text("quick_quote.profitability_metrics", "Métricas de Rentabilidad (Interno)") }
    static var productCost: String { FeatureL10n.text("quick_quote.product_cost", "Costo Productos") }
    static var extrasCost: String { FeatureL10n.text("quick_quote.extras_cost", "Costo Extras") }
    static var totalCost: String { FeatureL10n.text("quick_quote.total_cost", "Costo Total") }
    static var netProfit: String { FeatureL10n.text("quick_quote.net_profit", "Utilidad Neta") }
    static var margin: String { FeatureL10n.text("quick_quote.margin", "Margen") }
    static var export: String { FeatureL10n.text("quick_quote.export", "Exportar") }
    static var exportPDF: String { FeatureL10n.text("quick_quote.export_pdf", "Exportar PDF") }
    static var close: String { FeatureL10n.text("quick_quote.close", "Cerrar") }
    static var convertToEvent: String { FeatureL10n.text("quick_quote.convert_to_event", "A Evento") }
    static var product: String { FeatureL10n.text("quick_quote.product", "Producto") }
    static var quantity: String { FeatureL10n.text("quick_quote.quantity", "Cantidad") }
    static var description: String { FeatureL10n.text("quick_quote.description", "Descripción") }
    static var cost: String { FeatureL10n.text("quick_quote.cost", "Costo") }
    static var price: String { FeatureL10n.text("quick_quote.price", "Precio") }
    static var passthrough: String { FeatureL10n.text("quick_quote.passthrough", "Passthrough (Sin Utilidad)") }
    static var pdfFileName: String { FeatureL10n.text("quick_quote.pdf_file_name", "cotizacion-rapida.pdf") }

    static var pdfDate: String { FeatureL10n.text("quick_quote.pdf_date", "Fecha:") }
    static var pdfPeople: String { FeatureL10n.text("quick_quote.pdf_people", "Personas:") }
    static var pdfClient: String { FeatureL10n.text("quick_quote.pdf_client", "Cliente:") }
    static var pdfPhone: String { FeatureL10n.text("quick_quote.pdf_phone", "Tel:") }
    static var pdfProducts: String { FeatureL10n.text("quick_quote.pdf_products", "PRODUCTOS") }
    static var pdfExtras: String { FeatureL10n.text("quick_quote.pdf_extras", "EXTRAS") }
    static var pdfDescription: String { FeatureL10n.text("quick_quote.pdf_description", "Descripción") }
    static var pdfQuantity: String { FeatureL10n.text("quick_quote.pdf_quantity", "Cant.") }
    static var pdfUnitPrice: String { FeatureL10n.text("quick_quote.pdf_unit_price", "Precio Unit.") }
    static var pdfTotal: String { "TOTAL:" }
    static var pdfSubtotalProducts: String { FeatureL10n.text("quick_quote.pdf_subtotal_products", "Subtotal Productos:") }
    static var pdfSubtotalExtras: String { FeatureL10n.text("quick_quote.pdf_subtotal_extras", "Subtotal Extras:") }
    
    static func pdfDiscount(_ label: String) -> String {
        FeatureL10n.format("quick_quote.pdf_discount", "Descuento (%@):", label)
    }
    
    static func pdfTax(_ rate: Double) -> String {
        let value = Int(rate)
        return FeatureL10n.format("quick_quote.pdf_tax", "IVA (%lld%%):", value)
    }
    
    static var pdfDisclaimer: String {
        FeatureL10n.text(
            "quick_quote.pdf_disclaimer",
            "Esta cotización es informativa y no constituye un compromiso. Los precios pueden estar sujetos a cambios. Para confirmar, solicite un presupuesto formal."
        )
    }
    
    static var pdfFooter: String { FeatureL10n.text("quick_quote.pdf_footer", "Generado por Solennix") }
    
    static func formattedDate(from date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: isEnglish ? "en_US" : "es_MX")
        formatter.dateFormat = isEnglish ? "MMMM d, yyyy" : "d 'de' MMMM, yyyy"
        return formatter.string(from: date)
    }
}
