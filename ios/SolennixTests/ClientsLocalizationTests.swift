import XCTest
import Foundation
@testable import SolennixFeatures

// MARK: - Clients Localization Tests

/// Resolution smoke tests (B-1, system-locale resolution). See the contract in
/// `AuthLocalizationTests`; these tests assert the EXPECTED value for the
/// simulator's current system locale (no runtime override — retired in B-1).
final class ClientsLocalizationTests: XCTestCase {

    private func expected(spanish: String, english: String) -> String {
        FeatureL10n.languageCode == "en" ? english : spanish
    }

    func testQuickQuoteStringsResolve() {
        XCTAssertEqual(QuickQuoteStrings.title, expected(spanish: "Cotización Rápida", english: "Quick Quote"))
        XCTAssertEqual(QuickQuoteStrings.compactTitle, expected(spanish: "Cotización rápida", english: "Quick quote"))
        XCTAssertEqual(QuickQuoteStrings.clientData, expected(spanish: "Datos del cliente (opcional, para el PDF)", english: "Client details (optional, for PDF)"))
        XCTAssertEqual(QuickQuoteStrings.clientName, expected(spanish: "Nombre del cliente", english: "Client name"))
        XCTAssertEqual(QuickQuoteStrings.phone, expected(spanish: "Teléfono", english: "Phone"))
        XCTAssertEqual(QuickQuoteStrings.email, expected(spanish: "Email", english: "Email"))
        XCTAssertEqual(QuickQuoteStrings.basicData, expected(spanish: "Datos Básicos", english: "Basic details"))
        XCTAssertEqual(QuickQuoteStrings.numPeople, expected(spanish: "Número de Personas", english: "Number of People"))
        XCTAssertEqual(QuickQuoteStrings.products, expected(spanish: "Productos", english: "Products"))
        XCTAssertEqual(QuickQuoteStrings.extras, expected(spanish: "Extras", english: "Extras"))
        XCTAssertEqual(QuickQuoteStrings.addProduct, expected(spanish: "Agregar Producto", english: "Add Product"))
        XCTAssertEqual(QuickQuoteStrings.addExtra, expected(spanish: "Agregar Extra", english: "Add Extra"))
        XCTAssertEqual(QuickQuoteStrings.discountBilling, expected(spanish: "Descuento y Facturación", english: "Discount & Billing"))
        XCTAssertEqual(QuickQuoteStrings.invoiceRequired, expected(spanish: "Requiere Factura (IVA)", english: "Invoice required (VAT)"))
        XCTAssertEqual(QuickQuoteStrings.discountType, expected(spanish: "Tipo de Descuento", english: "Discount Type"))
        XCTAssertEqual(QuickQuoteStrings.percentDiscount, expected(spanish: "Porcentaje (%)", english: "Percent (%)"))
        XCTAssertEqual(QuickQuoteStrings.fixedDiscount, expected(spanish: "Monto Fijo ($)", english: "Fixed Amount ($)"))
        XCTAssertEqual(QuickQuoteStrings.discount, expected(spanish: "Descuento", english: "Discount"))
        XCTAssertEqual(QuickQuoteStrings.summary, expected(spanish: "Resumen", english: "Summary"))
        XCTAssertEqual(QuickQuoteStrings.subtotalProducts, expected(spanish: "Subtotal Productos", english: "Products Subtotal"))
        XCTAssertEqual(QuickQuoteStrings.subtotalExtras, expected(spanish: "Subtotal Extras", english: "Extras Subtotal"))
        XCTAssertEqual(QuickQuoteStrings.vat, expected(spanish: "IVA", english: "VAT"))
        XCTAssertEqual(QuickQuoteStrings.total, expected(spanish: "Total", english: "Total"))
        XCTAssertEqual(QuickQuoteStrings.profitabilityMetrics, expected(spanish: "Métricas de Rentabilidad (Interno)", english: "Profitability Metrics (Internal)"))
        XCTAssertEqual(QuickQuoteStrings.productCost, expected(spanish: "Costo Productos", english: "Products Cost"))
        XCTAssertEqual(QuickQuoteStrings.extrasCost, expected(spanish: "Costo Extras", english: "Extras Cost"))
        XCTAssertEqual(QuickQuoteStrings.totalCost, expected(spanish: "Costo Total", english: "Total Cost"))
        XCTAssertEqual(QuickQuoteStrings.netProfit, expected(spanish: "Utilidad Neta", english: "Net Profit"))
        XCTAssertEqual(QuickQuoteStrings.margin, expected(spanish: "Margen", english: "Margin"))
        XCTAssertEqual(QuickQuoteStrings.export, expected(spanish: "Exportar", english: "Export"))
        XCTAssertEqual(QuickQuoteStrings.exportPDF, expected(spanish: "Exportar PDF", english: "Export PDF"))
        XCTAssertEqual(QuickQuoteStrings.close, expected(spanish: "Cerrar", english: "Close"))
        XCTAssertEqual(QuickQuoteStrings.convertToEvent, expected(spanish: "A Evento", english: "Convert to Event"))
        XCTAssertEqual(QuickQuoteStrings.product, expected(spanish: "Producto", english: "Product"))
        XCTAssertEqual(QuickQuoteStrings.quantity, expected(spanish: "Cantidad", english: "Quantity"))
        XCTAssertEqual(QuickQuoteStrings.description, expected(spanish: "Descripción", english: "Description"))
        XCTAssertEqual(QuickQuoteStrings.cost, expected(spanish: "Costo", english: "Cost"))
        XCTAssertEqual(QuickQuoteStrings.price, expected(spanish: "Precio", english: "Price"))
        XCTAssertEqual(QuickQuoteStrings.passthrough, expected(spanish: "Passthrough (Sin Utilidad)", english: "Pass-through (No Profit)"))
        XCTAssertEqual(QuickQuoteStrings.pdfFileName, expected(spanish: "cotizacion-rapida.pdf", english: "quick-quote.pdf"))

        XCTAssertEqual(QuickQuoteStrings.pdfDate, expected(spanish: "Fecha:", english: "Date:"))
        XCTAssertEqual(QuickQuoteStrings.pdfPeople, expected(spanish: "Personas:", english: "People:"))
        XCTAssertEqual(QuickQuoteStrings.pdfClient, expected(spanish: "Cliente:", english: "Client:"))
        XCTAssertEqual(QuickQuoteStrings.pdfPhone, expected(spanish: "Tel:", english: "Phone:"))
        XCTAssertEqual(QuickQuoteStrings.pdfProducts, expected(spanish: "PRODUCTOS", english: "PRODUCTS"))
        XCTAssertEqual(QuickQuoteStrings.pdfExtras, expected(spanish: "EXTRAS", english: "EXTRAS"))
        XCTAssertEqual(QuickQuoteStrings.pdfDescription, expected(spanish: "Descripción", english: "Description"))
        XCTAssertEqual(QuickQuoteStrings.pdfQuantity, expected(spanish: "Cant.", english: "Qty."))
        XCTAssertEqual(QuickQuoteStrings.pdfUnitPrice, expected(spanish: "Precio Unit.", english: "Unit Price"))
        XCTAssertEqual(QuickQuoteStrings.pdfTotal, expected(spanish: "TOTAL:", english: "TOTAL:"))
        XCTAssertEqual(QuickQuoteStrings.pdfSubtotalProducts, expected(spanish: "Subtotal Productos:", english: "Products Subtotal:"))
        XCTAssertEqual(QuickQuoteStrings.pdfSubtotalExtras, expected(spanish: "Subtotal Extras:", english: "Extras Subtotal:"))

        XCTAssertEqual(QuickQuoteStrings.pdfDiscount("10%"), expected(spanish: "Descuento (10%):", english: "Discount (10%):"))
        XCTAssertEqual(QuickQuoteStrings.pdfTax(16.0), expected(spanish: "IVA (16%):", english: "VAT (16%):"))
        XCTAssertEqual(QuickQuoteStrings.pdfFooter, expected(spanish: "Generado por Solennix", english: "Generated by Solennix"))

        let testDate = Calendar.current.date(from: DateComponents(year: 2026, month: 6, day: 1))!
        XCTAssertEqual(QuickQuoteStrings.formattedDate(from: testDate), expected(spanish: "1 de junio, 2026", english: "June 1, 2026"))
    }
}
