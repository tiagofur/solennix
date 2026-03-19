import UIKit
import SolennixCore

struct QuickQuotePDFGenerator {

    struct QuoteItem {
        let name: String
        let quantity: Int
        let unitPrice: Double
        let total: Double
    }

    struct QuoteExtra {
        let description: String
        let price: Double
    }

    /// Generates a quick quote PDF.
    /// - Parameters:
    ///   - profile: The user/business profile (optional).
    ///   - numPeople: Number of people for the quote.
    ///   - items: Product items with pricing.
    ///   - extras: Extra items/services.
    ///   - productsSubtotal: Subtotal for products.
    ///   - extrasTotal: Subtotal for extras.
    ///   - discountAmount: Discount amount applied.
    ///   - discountLabel: Label describing the discount (e.g., "10%" or fixed amount).
    ///   - taxAmount: Tax amount (IVA).
    ///   - taxRate: Tax rate percentage.
    ///   - total: Final total amount.
    /// - Returns: PDF data.
    static func generate(
        profile: User?,
        numPeople: Int,
        items: [QuoteItem],
        extras: [QuoteExtra],
        productsSubtotal: Double,
        extrasTotal: Double,
        discountAmount: Double,
        discountLabel: String,
        taxAmount: Double,
        taxRate: Double,
        total: Double
    ) -> Data {
        let renderer = UIGraphicsPDFRenderer(bounds: PDFConstants.pageRect)

        return renderer.pdfData { context in
            context.beginPage()

            // MARK: Header
            var y = PDFConstants.drawHeader(context: context, title: "Cotización Rápida", profile: profile)

            // MARK: Quote Info
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "d 'de' MMMM, yyyy"
            dateFormatter.locale = Locale(identifier: "es_MX")
            let todayStr = dateFormatter.string(from: Date())

            let leftItems: [(String, String)] = [
                ("Fecha:", todayStr),
                ("Personas:", "\(numPeople)")
            ]
            let rightItems: [(String, String)] = []
            y = PDFConstants.drawInfoGrid(context: context, y: y, leftItems: leftItems, rightItems: rightItems)
            y += 8

            // MARK: Products Table
            if !items.isEmpty {
                y = PDFConstants.drawSectionHeader(context: context, y: y, title: "PRODUCTOS")

                let rows: [[String]] = items.map { item in
                    [
                        item.name,
                        "\(item.quantity)",
                        PDFConstants.formatCurrency(item.unitPrice),
                        PDFConstants.formatCurrency(item.total)
                    ]
                }

                y = PDFConstants.drawTable(
                    context: context,
                    y: y,
                    headers: ["Descripción", "Cant.", "Precio Unit.", "Total"],
                    rows: rows,
                    columnWidths: [0.45, 0.10, 0.22, 0.23],
                    rightAlignedColumns: [1, 2, 3]
                )
            }

            // MARK: Extras Table
            if !extras.isEmpty {
                y = PDFConstants.drawSectionHeader(context: context, y: y, title: "EXTRAS")

                let rows: [[String]] = extras.map { extra in
                    [
                        extra.description,
                        "1",
                        PDFConstants.formatCurrency(extra.price),
                        PDFConstants.formatCurrency(extra.price)
                    ]
                }

                y = PDFConstants.drawTable(
                    context: context,
                    y: y,
                    headers: ["Descripción", "Cant.", "Precio Unit.", "Total"],
                    rows: rows,
                    columnWidths: [0.45, 0.10, 0.22, 0.23],
                    rightAlignedColumns: [1, 2, 3]
                )
            }

            y += 4

            // MARK: Financial Summary
            y = PDFConstants.drawSummaryRow(
                context: context,
                y: y,
                label: "Subtotal Productos:",
                value: PDFConstants.formatCurrency(productsSubtotal)
            )

            if extrasTotal > 0 {
                y = PDFConstants.drawSummaryRow(
                    context: context,
                    y: y,
                    label: "Subtotal Extras:",
                    value: PDFConstants.formatCurrency(extrasTotal)
                )
            }

            if discountAmount > 0 {
                y = PDFConstants.drawSummaryRow(
                    context: context,
                    y: y,
                    label: "Descuento (\(discountLabel)):",
                    value: "- \(PDFConstants.formatCurrency(discountAmount))"
                )
            }

            if taxAmount > 0 {
                let taxLabel = "IVA (\(Int(taxRate))%):"
                y = PDFConstants.drawSummaryRow(
                    context: context,
                    y: y,
                    label: taxLabel,
                    value: PDFConstants.formatCurrency(taxAmount)
                )
            }

            // Separator before total
            PDFConstants.drawSeparator(context: context, y: y, color: PDFConstants.brandColor, thickness: 1)
            y += 6

            // Total
            y = PDFConstants.drawSummaryRow(
                context: context,
                y: y,
                label: "TOTAL:",
                value: PDFConstants.formatCurrency(total),
                valueColor: PDFConstants.brandColor,
                bold: true
            )

            // MARK: Footer Note
            y += 12
            y = PDFConstants.drawBodyText(
                context: context,
                y: y,
                text: "Esta cotización es informativa y no constituye un compromiso. Los precios pueden estar sujetos a cambios. Para confirmar, solicite un presupuesto formal."
            )

            // Page footer
            PDFConstants.drawFooterText(context: context, text: "Generado por Solennix")
        }
    }
}
