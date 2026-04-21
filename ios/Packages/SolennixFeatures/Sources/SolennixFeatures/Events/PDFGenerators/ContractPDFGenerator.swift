import UIKit
import SolennixCore

struct ContractPDFGenerator {

    /// Generates a contract PDF for the given event.
    /// Pass the full viewModel context (products, payments, productNames) so every
    /// token in the user's saved template can be resolved — mirror of the render
    /// logic in EventContractPreviewView.
    static func generate(
        event: Event,
        client: Client,
        profile: User?,
        products: [EventProduct] = [],
        payments: [Payment] = [],
        productNames: [String: String] = [:]
    ) -> Data {
        let renderer = UIGraphicsPDFRenderer(bounds: PDFConstants.pageRect)

        return renderer.pdfData { context in
            context.beginPage()

            // MARK: Header
            var y = PDFConstants.drawHeader(context: context, title: "Contrato de Servicios", profile: profile)

            // MARK: Contract Body
            let template = profile?.contractTemplate ?? defaultContractTemplate()
            let body = replaceTokens(
                in: template,
                event: event,
                client: client,
                profile: profile,
                products: products,
                payments: payments,
                productNames: productNames
            )

            y = drawContractBody(context: context, y: y, text: body)

            // MARK: Signature Boxes
            y += 24
            y = drawSignatureBoxes(context: context, y: y, profile: profile, client: client)

            // Page footer
            PDFConstants.drawFooterText(context: context, text: "Generado por Solennix")
        }
    }

    // MARK: - Token Replacement

    private static func replaceTokens(
        in template: String,
        event: Event,
        client: Client,
        profile: User?,
        products: [EventProduct],
        payments: [Payment],
        productNames: [String: String]
    ) -> String {
        let eventDateFormatted = PDFConstants.formatDate(event.eventDate)
        let todayFormatted = PDFConstants.dateFormatter.string(from: Date())
        let depositPercent = event.depositPercent ?? profile?.defaultDepositPercent ?? 0
        let depositAmount = event.totalAmount * (depositPercent / 100)
        let cancellationDays = event.cancellationDays ?? profile?.defaultCancellationDays ?? 0
        let refundPercent = event.refundPercent ?? profile?.defaultRefundPercent ?? 0
        let totalPaid = payments.reduce(0) { $0 + $1.amount }

        // Compute discount. Usamos el MISMO subtotal/formula que
        // EventFinancesDetailView para que el PDF matchee exacto los
        // numeros que el usuario ve en la UI. Evita la situacion donde
        // el cliente firma un contrato con un monto distinto al que se
        // le mostro en la app.
        let subtotalForDiscount = event.totalAmount - event.taxAmount
            + (event.discountType == .fixed ? event.discount : 0)
        let discountValue: Double = event.discountType == .percent
            ? subtotalForDiscount * event.discount / 100
            : event.discount

        // Compose complex tokens
        let scheduleValue: String = {
            if let s = event.startTime, let e = event.endTime { return "\(s) - \(e)" }
            return event.startTime ?? event.endTime ?? "—"
        }()

        let servicesValue: String = {
            guard !products.isEmpty else { return "—" }
            return products
                .map { "\(Int($0.quantity)) \(productNames[$0.productId] ?? "Producto")" }
                .joined(separator: ", ")
        }()

        let tokenMap: [String: String] = [
            "[Nombre del cliente]": client.name,
            "[Teléfono del cliente]": client.phone,
            "[Email del cliente]": client.email ?? "—",
            "[Dirección del cliente]": client.address ?? "—",
            "[Ciudad del cliente]": client.city ?? "—",
            "[Fecha del evento]": eventDateFormatted,
            "[Hora de inicio]": event.startTime ?? "—",
            "[Hora de fin]": event.endTime ?? "—",
            "[Horario del evento]": scheduleValue,
            "[Tipo de servicio]": event.serviceType,
            "[Número de personas]": "\(event.numPeople)",
            "[Ubicación del evento]": event.location ?? "—",
            "[Ciudad del evento]": event.city ?? "—",
            "[Lugar del evento]": event.location ?? "—",
            "[Monto total del evento]": PDFConstants.formatCurrency(event.totalAmount),
            "[Subtotal del evento]": PDFConstants.formatCurrency(event.totalAmount - event.taxAmount + discountValue),
            "[Descuento del evento]": PDFConstants.formatCurrency(discountValue),
            "[IVA del evento]": PDFConstants.formatCurrency(event.taxAmount),
            "[Porcentaje de anticipo]": "\(Int(depositPercent))%",
            "[Monto de anticipo]": PDFConstants.formatCurrency(depositAmount),
            "[Total pagado]": PDFConstants.formatCurrency(totalPaid),
            "[Días de cancelación]": "\(Int(cancellationDays))",
            "[Porcentaje de reembolso]": "\(Int(refundPercent))%",
            "[Nombre del negocio]": profile?.businessName ?? profile?.name ?? "—",
            "[Nombre comercial del proveedor]": profile?.businessName ?? profile?.name ?? "—",
            "[Nombre del proveedor]": profile?.name ?? "—",
            "[Email del proveedor]": profile?.email ?? "—",
            "[Fecha actual]": todayFormatted,
            "[Ciudad del contrato]": event.city ?? client.city ?? "—",
            "[Servicios del evento]": servicesValue,
            "[Notas del evento]": event.notes ?? ""
        ]

        var result = template
        for (token, value) in tokenMap {
            result = result.replacingOccurrences(of: token, with: value)
        }
        // Templates sometimes end up with literal '%%' when the author typed '%'
        // right after a percentage token (e.g. "[Porcentaje de anticipo]%"). The
        // token already renders "19%", so the adjacent '%' produces "19%%".
        // Normalize any resulting double-percent back to single.
        result = result.replacingOccurrences(of: "%%", with: "%")
        return result
    }

    // MARK: - Drawing Helpers

    private static func drawContractBody(context: UIGraphicsPDFRendererContext, y startY: CGFloat, text: String) -> CGFloat {
        let attrs: [NSAttributedString.Key: Any] = [
            .font: PDFConstants.bodyFont,
            .foregroundColor: PDFConstants.textColor
        ]

        let paragraphs = text.components(separatedBy: "\n")
        var currentY = startY

        for paragraph in paragraphs {
            if paragraph.trimmingCharacters(in: .whitespaces).isEmpty {
                currentY += 8
                continue
            }

            let str = paragraph as NSString
            let size = str.boundingRect(
                with: CGSize(width: PDFConstants.contentWidth, height: .greatestFiniteMagnitude),
                options: .usesLineFragmentOrigin,
                attributes: attrs,
                context: nil
            )

            // Check if we need a new page
            if currentY + size.height + 4 > PDFConstants.pageHeight - PDFConstants.marginBottom {
                PDFConstants.drawFooterText(context: context, text: "Generado por Solennix")
                context.beginPage()
                currentY = PDFConstants.marginTop
            }

            str.draw(
                in: CGRect(x: PDFConstants.marginLeft, y: currentY, width: PDFConstants.contentWidth, height: size.height + 2),
                withAttributes: attrs
            )
            currentY += size.height + 4
        }

        return currentY
    }

    private static func drawSignatureBoxes(context: UIGraphicsPDFRendererContext, y startY: CGFloat, profile: User?, client: Client) -> CGFloat {
        let boxHeight: CGFloat = 80
        var y = PDFConstants.ensureSpace(context: context, currentY: startY, needed: boxHeight + 40)

        let colWidth = PDFConstants.contentWidth / 2 - 10
        let leftX = PDFConstants.marginLeft
        let rightX = PDFConstants.marginLeft + PDFConstants.contentWidth / 2 + 10

        let labelAttrs: [NSAttributedString.Key: Any] = [
            .font: PDFConstants.bodyBoldFont,
            .foregroundColor: PDFConstants.textColor
        ]
        let nameAttrs: [NSAttributedString.Key: Any] = [
            .font: PDFConstants.bodyFont,
            .foregroundColor: PDFConstants.grayColor
        ]

        // Left: EL PROVEEDOR
        ("EL PROVEEDOR" as NSString).draw(
            in: CGRect(x: leftX, y: y, width: colWidth, height: 16),
            withAttributes: labelAttrs
        )

        // Signature line
        let lineY = y + 50
        let linePath = UIBezierPath()
        linePath.move(to: CGPoint(x: leftX, y: lineY))
        linePath.addLine(to: CGPoint(x: leftX + colWidth, y: lineY))
        linePath.lineWidth = 0.5
        PDFConstants.grayColor.setStroke()
        linePath.stroke()

        let providerName = profile?.name ?? "—"
        (providerName as NSString).draw(
            in: CGRect(x: leftX, y: lineY + 4, width: colWidth, height: 16),
            withAttributes: nameAttrs
        )

        // Right: EL CLIENTE
        ("EL CLIENTE" as NSString).draw(
            in: CGRect(x: rightX, y: y, width: colWidth, height: 16),
            withAttributes: labelAttrs
        )

        let linePath2 = UIBezierPath()
        linePath2.move(to: CGPoint(x: rightX, y: lineY))
        linePath2.addLine(to: CGPoint(x: rightX + colWidth, y: lineY))
        linePath2.lineWidth = 0.5
        PDFConstants.grayColor.setStroke()
        linePath2.stroke()

        (client.name as NSString).draw(
            in: CGRect(x: rightX, y: lineY + 4, width: colWidth, height: 16),
            withAttributes: nameAttrs
        )

        return lineY + 24
    }

    // MARK: - Default Template

    private static func defaultContractTemplate() -> String {
        """
        CONTRATO DE PRESTACIÓN DE SERVICIOS

        En la ciudad de [Ciudad del evento], a [Fecha actual], comparecen por una parte [Nombre del negocio], en lo sucesivo "EL PROVEEDOR", y por otra parte [Nombre del cliente], en lo sucesivo "EL CLIENTE".

        DECLARACIONES

        EL PROVEEDOR declara que cuenta con la capacidad y experiencia para proporcionar servicios de [Tipo de servicio].

        EL CLIENTE declara que requiere los servicios de EL PROVEEDOR para el evento a celebrarse el día [Fecha del evento] en [Ubicación del evento].

        CLÁUSULAS

        PRIMERA. OBJETO DEL CONTRATO
        EL PROVEEDOR se compromete a prestar servicios de [Tipo de servicio] para [Número de personas] personas el día [Fecha del evento], con horario de [Hora de inicio] a [Hora de fin].

        SEGUNDA. PRECIO Y FORMA DE PAGO
        El precio total de los servicios será de [Monto total del evento]. EL CLIENTE deberá cubrir un anticipo del [Porcentaje de anticipo] ([Monto de anticipo]) al momento de la firma del presente contrato. El saldo restante deberá cubrirse a más tardar el día del evento.

        TERCERA. CANCELACIÓN
        En caso de cancelación por parte de EL CLIENTE con menos de [Días de cancelación] días de anticipación, EL PROVEEDOR reembolsará el [Porcentaje de reembolso] del anticipo.

        CUARTA. OBLIGACIONES DEL PROVEEDOR
        EL PROVEEDOR se obliga a proporcionar los servicios pactados en tiempo y forma, conforme a las especificaciones acordadas.

        QUINTA. OBLIGACIONES DEL CLIENTE
        EL CLIENTE se obliga a realizar los pagos en los plazos acordados y a proporcionar las facilidades necesarias para la prestación del servicio.

        Leído el presente contrato, ambas partes lo firman de conformidad.
        """
    }
}
