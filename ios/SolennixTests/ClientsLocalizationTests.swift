import XCTest
import Foundation
@testable import SolennixFeatures

final class ClientsLocalizationTests: XCTestCase {

    override func setUp() {
        super.setUp()
        // Save the previous preferred locale to avoid polluting user settings
        let oldLocale = UserDefaults.standard.string(forKey: "preferredLocale")
        addTeardownBlock {
            if let oldLocale = oldLocale {
                UserDefaults.standard.set(oldLocale, forKey: "preferredLocale")
            } else {
                UserDefaults.standard.removeObject(forKey: "preferredLocale")
            }
        }
    }

    func testQuickQuoteStringsResolveForSpanish() {
        UserDefaults.standard.set("es-MX", forKey: "preferredLocale")
        
        XCTAssertEqual(QuickQuoteStrings.title, "Cotización Rápida")
        XCTAssertEqual(QuickQuoteStrings.compactTitle, "Cotización rápida")
        XCTAssertEqual(QuickQuoteStrings.clientData, "Datos del cliente (opcional, para el PDF)")
        XCTAssertEqual(QuickQuoteStrings.clientName, "Nombre del cliente")
        XCTAssertEqual(QuickQuoteStrings.phone, "Teléfono")
        XCTAssertEqual(QuickQuoteStrings.email, "Email")
        XCTAssertEqual(QuickQuoteStrings.basicData, "Datos Básicos")
        XCTAssertEqual(QuickQuoteStrings.numPeople, "Número de Personas")
        XCTAssertEqual(QuickQuoteStrings.products, "Productos")
        XCTAssertEqual(QuickQuoteStrings.extras, "Extras")
        XCTAssertEqual(QuickQuoteStrings.addProduct, "Agregar Producto")
        XCTAssertEqual(QuickQuoteStrings.addExtra, "Agregar Extra")
        XCTAssertEqual(QuickQuoteStrings.discountBilling, "Descuento y Facturación")
        XCTAssertEqual(QuickQuoteStrings.invoiceRequired, "Requiere Factura (IVA)")
        XCTAssertEqual(QuickQuoteStrings.discountType, "Tipo de Descuento")
        XCTAssertEqual(QuickQuoteStrings.percentDiscount, "Porcentaje (%)")
        XCTAssertEqual(QuickQuoteStrings.fixedDiscount, "Monto Fijo ($)")
        XCTAssertEqual(QuickQuoteStrings.discount, "Descuento")
        XCTAssertEqual(QuickQuoteStrings.summary, "Resumen")
        XCTAssertEqual(QuickQuoteStrings.subtotalProducts, "Subtotal Productos")
        XCTAssertEqual(QuickQuoteStrings.subtotalExtras, "Subtotal Extras")
        XCTAssertEqual(QuickQuoteStrings.vat, "IVA")
        XCTAssertEqual(QuickQuoteStrings.total, "Total")
        XCTAssertEqual(QuickQuoteStrings.profitabilityMetrics, "Métricas de Rentabilidad (Interno)")
        XCTAssertEqual(QuickQuoteStrings.productCost, "Costo Productos")
        XCTAssertEqual(QuickQuoteStrings.extrasCost, "Costo Extras")
        XCTAssertEqual(QuickQuoteStrings.totalCost, "Costo Total")
        XCTAssertEqual(QuickQuoteStrings.netProfit, "Utilidad Neta")
        XCTAssertEqual(QuickQuoteStrings.margin, "Margen")
        XCTAssertEqual(QuickQuoteStrings.export, "Exportar")
        XCTAssertEqual(QuickQuoteStrings.exportPDF, "Exportar PDF")
        XCTAssertEqual(QuickQuoteStrings.close, "Cerrar")
        XCTAssertEqual(QuickQuoteStrings.convertToEvent, "A Evento")
        XCTAssertEqual(QuickQuoteStrings.product, "Producto")
        XCTAssertEqual(QuickQuoteStrings.quantity, "Cantidad")
        XCTAssertEqual(QuickQuoteStrings.description, "Descripción")
        XCTAssertEqual(QuickQuoteStrings.cost, "Costo")
        XCTAssertEqual(QuickQuoteStrings.price, "Precio")
        XCTAssertEqual(QuickQuoteStrings.passthrough, "Passthrough (Sin Utilidad)")
        XCTAssertEqual(QuickQuoteStrings.pdfFileName, "cotizacion-rapida.pdf")

        XCTAssertEqual(QuickQuoteStrings.pdfDate, "Fecha:")
        XCTAssertEqual(QuickQuoteStrings.pdfPeople, "Personas:")
        XCTAssertEqual(QuickQuoteStrings.pdfClient, "Cliente:")
        XCTAssertEqual(QuickQuoteStrings.pdfPhone, "Tel:")
        XCTAssertEqual(QuickQuoteStrings.pdfProducts, "PRODUCTOS")
        XCTAssertEqual(QuickQuoteStrings.pdfExtras, "EXTRAS")
        XCTAssertEqual(QuickQuoteStrings.pdfDescription, "Descripción")
        XCTAssertEqual(QuickQuoteStrings.pdfQuantity, "Cant.")
        XCTAssertEqual(QuickQuoteStrings.pdfUnitPrice, "Precio Unit.")
        XCTAssertEqual(QuickQuoteStrings.pdfTotal, "TOTAL:")
        XCTAssertEqual(QuickQuoteStrings.pdfSubtotalProducts, "Subtotal Productos:")
        XCTAssertEqual(QuickQuoteStrings.pdfSubtotalExtras, "Subtotal Extras:")
        
        XCTAssertEqual(QuickQuoteStrings.pdfDiscount("10%"), "Descuento (10%):")
        XCTAssertEqual(QuickQuoteStrings.pdfTax(16.0), "IVA (16%):")
        XCTAssertEqual(QuickQuoteStrings.pdfFooter, "Generado por Solennix")
        
        let testDate = Calendar.current.date(from: DateComponents(year: 2026, month: 6, day: 1))!
        XCTAssertEqual(QuickQuoteStrings.formattedDate(from: testDate), "1 de junio, 2026")
    }

    func testQuickQuoteStringsResolveForEnglish() {
        UserDefaults.standard.set("en-US", forKey: "preferredLocale")
        
        XCTAssertEqual(QuickQuoteStrings.title, "Quick Quote")
        XCTAssertEqual(QuickQuoteStrings.compactTitle, "Quick quote")
        XCTAssertEqual(QuickQuoteStrings.clientData, "Client details (optional, for PDF)")
        XCTAssertEqual(QuickQuoteStrings.clientName, "Client name")
        XCTAssertEqual(QuickQuoteStrings.phone, "Phone")
        XCTAssertEqual(QuickQuoteStrings.email, "Email")
        XCTAssertEqual(QuickQuoteStrings.basicData, "Basic details")
        XCTAssertEqual(QuickQuoteStrings.numPeople, "Number of People")
        XCTAssertEqual(QuickQuoteStrings.products, "Products")
        XCTAssertEqual(QuickQuoteStrings.extras, "Extras")
        XCTAssertEqual(QuickQuoteStrings.addProduct, "Add Product")
        XCTAssertEqual(QuickQuoteStrings.addExtra, "Add Extra")
        XCTAssertEqual(QuickQuoteStrings.discountBilling, "Discount & Billing")
        XCTAssertEqual(QuickQuoteStrings.invoiceRequired, "Invoice required (VAT)")
        XCTAssertEqual(QuickQuoteStrings.discountType, "Discount Type")
        XCTAssertEqual(QuickQuoteStrings.percentDiscount, "Percent (%)")
        XCTAssertEqual(QuickQuoteStrings.fixedDiscount, "Fixed Amount ($)")
        XCTAssertEqual(QuickQuoteStrings.discount, "Discount")
        XCTAssertEqual(QuickQuoteStrings.summary, "Summary")
        XCTAssertEqual(QuickQuoteStrings.subtotalProducts, "Products Subtotal")
        XCTAssertEqual(QuickQuoteStrings.subtotalExtras, "Extras Subtotal")
        XCTAssertEqual(QuickQuoteStrings.vat, "VAT")
        XCTAssertEqual(QuickQuoteStrings.total, "Total")
        XCTAssertEqual(QuickQuoteStrings.profitabilityMetrics, "Profitability Metrics (Internal)")
        XCTAssertEqual(QuickQuoteStrings.productCost, "Products Cost")
        XCTAssertEqual(QuickQuoteStrings.extrasCost, "Extras Cost")
        XCTAssertEqual(QuickQuoteStrings.totalCost, "Total Cost")
        XCTAssertEqual(QuickQuoteStrings.netProfit, "Net Profit")
        XCTAssertEqual(QuickQuoteStrings.margin, "Margin")
        XCTAssertEqual(QuickQuoteStrings.export, "Export")
        XCTAssertEqual(QuickQuoteStrings.exportPDF, "Export PDF")
        XCTAssertEqual(QuickQuoteStrings.close, "Close")
        XCTAssertEqual(QuickQuoteStrings.convertToEvent, "Convert to Event")
        XCTAssertEqual(QuickQuoteStrings.product, "Product")
        XCTAssertEqual(QuickQuoteStrings.quantity, "Quantity")
        XCTAssertEqual(QuickQuoteStrings.description, "Description")
        XCTAssertEqual(QuickQuoteStrings.cost, "Cost")
        XCTAssertEqual(QuickQuoteStrings.price, "Price")
        XCTAssertEqual(QuickQuoteStrings.passthrough, "Pass-through (No Profit)")
        XCTAssertEqual(QuickQuoteStrings.pdfFileName, "quick-quote.pdf")

        XCTAssertEqual(QuickQuoteStrings.pdfDate, "Date:")
        XCTAssertEqual(QuickQuoteStrings.pdfPeople, "People:")
        XCTAssertEqual(QuickQuoteStrings.pdfClient, "Client:")
        XCTAssertEqual(QuickQuoteStrings.pdfPhone, "Phone:")
        XCTAssertEqual(QuickQuoteStrings.pdfProducts, "PRODUCTS")
        XCTAssertEqual(QuickQuoteStrings.pdfExtras, "EXTRAS")
        XCTAssertEqual(QuickQuoteStrings.pdfDescription, "Description")
        XCTAssertEqual(QuickQuoteStrings.pdfQuantity, "Qty.")
        XCTAssertEqual(QuickQuoteStrings.pdfUnitPrice, "Unit Price")
        XCTAssertEqual(QuickQuoteStrings.pdfTotal, "TOTAL:")
        XCTAssertEqual(QuickQuoteStrings.pdfSubtotalProducts, "Products Subtotal:")
        XCTAssertEqual(QuickQuoteStrings.pdfSubtotalExtras, "Extras Subtotal:")
        
        XCTAssertEqual(QuickQuoteStrings.pdfDiscount("10%"), "Discount (10%):")
        XCTAssertEqual(QuickQuoteStrings.pdfTax(16.0), "VAT (16%):")
        XCTAssertEqual(QuickQuoteStrings.pdfFooter, "Generated by Solennix")
        
        let testDate = Calendar.current.date(from: DateComponents(year: 2026, month: 6, day: 1))!
        XCTAssertEqual(QuickQuoteStrings.formattedDate(from: testDate), "June 1, 2026")
    }
}
