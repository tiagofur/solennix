import UIKit
import SolennixCore

struct EquipmentListPDFGenerator {

    /// Generates an equipment list PDF for the given event.
    /// - Parameters:
    ///   - event: The event to generate the equipment list for.
    ///   - client: The client associated with the event (optional).
    ///   - profile: The user/business profile (optional).
    ///   - equipment: Equipment items assigned to the event.
    /// - Returns: PDF data.
    static func generate(
        event: Event,
        client: Client?,
        profile: User?,
        equipment: [EventEquipment]
    ) -> Data {
        let renderer = UIGraphicsPDFRenderer(bounds: PDFConstants.pageRect)

        return renderer.pdfData { context in
            context.beginPage()

            // MARK: Header
            var y = PDFConstants.drawHeader(context: context, title: "Lista de Equipo", profile: profile)

            // MARK: Event Info
            let leftItems: [(String, String)] = [
                ("Evento:", event.serviceType),
                ("Fecha:", PDFConstants.formatDate(event.eventDate)),
                ("Personas:", "\(event.numPeople)")
            ]
            var rightItems: [(String, String)] = [
                ("Ubicación:", event.location ?? "\u{2014}"),
                ("Hora:", event.startTime ?? "\u{2014}")
            ]
            if let clientName = client?.name {
                rightItems.insert(("Cliente:", clientName), at: 0)
            }
            y = PDFConstants.drawInfoGrid(context: context, y: y, leftItems: leftItems, rightItems: rightItems)
            y += 8

            // MARK: Equipment Table
            y = PDFConstants.drawSectionHeader(context: context, y: y, title: "EQUIPO")

            let hasNotes = equipment.contains { $0.notes != nil && !($0.notes?.isEmpty ?? true) }

            let headers: [String]
            let columnWidths: [CGFloat]
            let rightAlignedColumns: Set<Int>

            if hasNotes {
                headers = ["#", "Equipo", "Cantidad", "Notas"]
                columnWidths = [0.08, 0.40, 0.12, 0.40]
                rightAlignedColumns = [2]
            } else {
                headers = ["#", "Equipo", "Cantidad"]
                columnWidths = [0.10, 0.65, 0.25]
                rightAlignedColumns = [2]
            }

            var rows: [[String]] = []
            for (index, item) in equipment.enumerated() {
                let name = item.equipmentName ?? "Equipo"
                let qty = "\(item.quantity)"
                if hasNotes {
                    let notes = item.notes ?? ""
                    rows.append(["\(index + 1)", name, qty, notes])
                } else {
                    rows.append(["\(index + 1)", name, qty])
                }
            }

            y = PDFConstants.drawTable(
                context: context,
                y: y,
                headers: headers,
                rows: rows,
                columnWidths: columnWidths,
                rightAlignedColumns: rightAlignedColumns
            )

            // MARK: Summary
            y += 8
            let totalItems = equipment.count
            let totalQuantity = equipment.reduce(0) { $0 + $1.quantity }

            y = PDFConstants.drawSummaryRow(
                context: context,
                y: y,
                label: "Total de equipos:",
                value: "\(totalItems)",
                bold: true
            )
            y = PDFConstants.drawSummaryRow(
                context: context,
                y: y,
                label: "Total de unidades:",
                value: "\(totalQuantity)",
                bold: true
            )

            // Page footer
            PDFConstants.drawFooterText(context: context, text: "Generado por Solennix")
        }
    }
}
