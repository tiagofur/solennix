import UIKit
import SolennixCore

struct ChecklistPDFGenerator {

    /// Generates a loading checklist PDF for the given event.
    static func generate(
        event: Event,
        client: Client?,
        profile: User?,
        products: [EventProduct],
        equipment: [EventEquipment],
        ingredients: [ShoppingListPDFGenerator.Ingredient],
        extras: [EventExtra],
        productNames: [String: String] = [:]
    ) -> Data {
        let renderer = UIGraphicsPDFRenderer(bounds: PDFConstants.pageRect)
        let checkbox = "\u{2610}" // ☐ Unicode 2610

        return renderer.pdfData { context in
            context.beginPage()

            // MARK: Header
            var y = PDFConstants.drawHeader(context: context, title: "Checklist de Carga", profile: profile)

            // MARK: Event Info
            let leftItems: [(String, String)] = [
                ("Evento:", event.serviceType),
                ("Fecha:", PDFConstants.formatDate(event.eventDate)),
                ("Personas:", "\(event.numPeople)")
            ]
            var rightItems: [(String, String)] = [
                ("Ubicación:", event.location ?? "—"),
                ("Hora:", event.startTime ?? "—")
            ]
            if let clientName = client?.name {
                rightItems.insert(("Cliente:", clientName), at: 0)
            }
            y = PDFConstants.drawInfoGrid(context: context, y: y, leftItems: leftItems, rightItems: rightItems)
            y += 8

            let checkboxAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 14),
                .foregroundColor: PDFConstants.textColor
            ]
            let itemAttrs: [NSAttributedString.Key: Any] = [
                .font: PDFConstants.bodyFont,
                .foregroundColor: PDFConstants.textColor
            ]
            let qtyAttrs: [NSAttributedString.Key: Any] = [
                .font: PDFConstants.bodyBoldFont,
                .foregroundColor: PDFConstants.grayColor
            ]
            let noteAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.italicSystemFont(ofSize: PDFConstants.bodyFontSize),
                .foregroundColor: PDFConstants.grayColor
            ]
            let rowHeight: CGFloat = 22

            // MARK: PRODUCTOS Section
            if !products.isEmpty {
                y = PDFConstants.drawSectionHeader(context: context, y: y, title: "PRODUCTOS")

                for product in products {
                    y = PDFConstants.ensureSpace(context: context, currentY: y, needed: rowHeight)
                    let name = productNames[product.productId] ?? "Producto"

                    (checkbox as NSString).draw(
                        in: CGRect(x: PDFConstants.marginLeft, y: y, width: 20, height: rowHeight),
                        withAttributes: checkboxAttrs
                    )
                    (name as NSString).draw(
                        in: CGRect(x: PDFConstants.marginLeft + 24, y: y + 2, width: PDFConstants.contentWidth * 0.6, height: rowHeight),
                        withAttributes: itemAttrs
                    )
                    let qtyText = "x\(product.quantity)"
                    (qtyText as NSString).draw(
                        in: CGRect(x: PDFConstants.marginLeft + PDFConstants.contentWidth * 0.7, y: y + 2, width: PDFConstants.contentWidth * 0.3, height: rowHeight),
                        withAttributes: qtyAttrs
                    )
                    y += rowHeight
                }
                y += 8
            }

            // MARK: EQUIPO Section
            if !equipment.isEmpty {
                y = PDFConstants.drawSectionHeader(context: context, y: y, title: "EQUIPO")

                for item in equipment {
                    y = PDFConstants.ensureSpace(context: context, currentY: y, needed: rowHeight)
                    let name = item.equipmentName ?? "Equipo"

                    (checkbox as NSString).draw(
                        in: CGRect(x: PDFConstants.marginLeft, y: y, width: 20, height: rowHeight),
                        withAttributes: checkboxAttrs
                    )
                    (name as NSString).draw(
                        in: CGRect(x: PDFConstants.marginLeft + 24, y: y + 2, width: PDFConstants.contentWidth * 0.45, height: rowHeight),
                        withAttributes: itemAttrs
                    )
                    let qtyText = "x\(item.quantity)"
                    (qtyText as NSString).draw(
                        in: CGRect(x: PDFConstants.marginLeft + PDFConstants.contentWidth * 0.5, y: y + 2, width: 60, height: rowHeight),
                        withAttributes: qtyAttrs
                    )
                    if let notes = item.notes, !notes.isEmpty {
                        (notes as NSString).draw(
                            in: CGRect(x: PDFConstants.marginLeft + PDFConstants.contentWidth * 0.6, y: y + 2, width: PDFConstants.contentWidth * 0.4, height: rowHeight),
                            withAttributes: noteAttrs
                        )
                    }
                    y += rowHeight
                }
                y += 8
            }

            // MARK: INSUMOS PARA LLEVAR Section
            if !ingredients.isEmpty {
                y = PDFConstants.drawSectionHeader(context: context, y: y, title: "INSUMOS PARA LLEVAR")

                let qtyFormatter = NumberFormatter()
                qtyFormatter.numberStyle = .decimal
                qtyFormatter.maximumFractionDigits = 2
                qtyFormatter.minimumFractionDigits = 0
                qtyFormatter.locale = Locale(identifier: "es_MX")

                for ingredient in ingredients {
                    y = PDFConstants.ensureSpace(context: context, currentY: y, needed: rowHeight)

                    (checkbox as NSString).draw(
                        in: CGRect(x: PDFConstants.marginLeft, y: y, width: 20, height: rowHeight),
                        withAttributes: checkboxAttrs
                    )
                    (ingredient.name as NSString).draw(
                        in: CGRect(x: PDFConstants.marginLeft + 24, y: y + 2, width: PDFConstants.contentWidth * 0.45, height: rowHeight),
                        withAttributes: itemAttrs
                    )
                    let qtyText = qtyFormatter.string(from: NSNumber(value: ingredient.quantity)) ?? "\(ingredient.quantity)"
                    (qtyText as NSString).draw(
                        in: CGRect(x: PDFConstants.marginLeft + PDFConstants.contentWidth * 0.5, y: y + 2, width: 60, height: rowHeight),
                        withAttributes: qtyAttrs
                    )
                    (ingredient.unit as NSString).draw(
                        in: CGRect(x: PDFConstants.marginLeft + PDFConstants.contentWidth * 0.65, y: y + 2, width: PDFConstants.contentWidth * 0.35, height: rowHeight),
                        withAttributes: itemAttrs
                    )
                    y += rowHeight
                }
                y += 8
            }

            // MARK: EXTRAS Section
            let physicalExtras = extras.filter { $0.includeInChecklist }
            if !physicalExtras.isEmpty {
                y = PDFConstants.drawSectionHeader(context: context, y: y, title: "EXTRAS")

                for extra in physicalExtras {
                    y = PDFConstants.ensureSpace(context: context, currentY: y, needed: rowHeight)

                    (checkbox as NSString).draw(
                        in: CGRect(x: PDFConstants.marginLeft, y: y, width: 20, height: rowHeight),
                        withAttributes: checkboxAttrs
                    )
                    (extra.description as NSString).draw(
                        in: CGRect(x: PDFConstants.marginLeft + 24, y: y + 2, width: PDFConstants.contentWidth - 24, height: rowHeight),
                        withAttributes: itemAttrs
                    )
                    y += rowHeight
                }
                y += 8
            }

            // MARK: Notes Lines
            y += 16
            y = PDFConstants.ensureSpace(context: context, currentY: y, needed: 100)
            let notesLabelAttrs: [NSAttributedString.Key: Any] = [
                .font: PDFConstants.bodyBoldFont,
                .foregroundColor: PDFConstants.textColor
            ]
            ("Notas:" as NSString).draw(
                in: CGRect(x: PDFConstants.marginLeft, y: y, width: PDFConstants.contentWidth, height: 16),
                withAttributes: notesLabelAttrs
            )
            y += 20

            for _ in 0..<4 {
                y = PDFConstants.ensureSpace(context: context, currentY: y, needed: 20)
                let linePath = UIBezierPath()
                linePath.move(to: CGPoint(x: PDFConstants.marginLeft, y: y))
                linePath.addLine(to: CGPoint(x: PDFConstants.marginLeft + PDFConstants.contentWidth, y: y))
                linePath.lineWidth = 0.3
                UIColor(white: 0.75, alpha: 1).setStroke()
                linePath.stroke()
                y += 20
            }

            // Page footer
            PDFConstants.drawFooterText(context: context, text: "Generado por Solennix")
        }
    }
}
