import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Contract Preview View

public struct EventContractPreviewView: View {

    let eventId: String

    @State private var viewModel: EventDetailViewModel
    @Environment(AuthManager.self) private var authManager
    @Environment(\.dismiss) private var dismiss

    public init(eventId: String, apiClient: APIClient) {
        self.eventId = eventId
        self._viewModel = State(initialValue: EventDetailViewModel(apiClient: apiClient))
    }

    private var profile: User? { authManager.currentUser }

    private var totalPaid: Double { viewModel.totalPaid }

    private var depositPercent: Double {
        guard let event = viewModel.event else { return 0 }
        return event.depositPercent ?? profile?.defaultDepositPercent ?? 0
    }

    private var depositAmount: Double {
        guard let event = viewModel.event else { return 0 }
        return event.totalAmount * (depositPercent / 100)
    }

    private var isDepositMet: Bool {
        depositPercent == 0 || totalPaid >= depositAmount
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.event == nil {
                ProgressView("Cargando...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let event = viewModel.event {
                contractContent(event)
            } else {
                EmptyStateView(
                    icon: "exclamationmark.triangle",
                    title: "Error",
                    message: viewModel.errorMessage ?? "No se pudo cargar el evento"
                )
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Contrato")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.loadEvent(eventId) }
    }

    // MARK: - Contract Content

    @ViewBuilder
    private func contractContent(_ event: Event) -> some View {
        if !isDepositMet {
            depositGateView(event)
        } else {
            let result = renderContract(event)
            if !result.missingTokens.isEmpty {
                missingFieldsView(result.missingTokens)
            } else {
                contractPreview(result.text, event)
            }
        }
    }

    // MARK: - Deposit Gate

    private func depositGateView(_ event: Event) -> some View {
        VStack(spacing: Spacing.lg) {
            Spacer()

            Image(systemName: "lock.fill")
                .font(.system(size: 48))
                .foregroundStyle(SolennixColors.warning)

            Text("Anticipo Requerido")
                .font(.title2)
                .fontWeight(.black)
                .foregroundStyle(SolennixColors.text)
                .textCase(.uppercase)

            Text("Para visualizar y generar el contrato, es necesario cubrir el anticipo mínimo del **\(Int(depositPercent))%**")
                .font(.body)
                .foregroundStyle(SolennixColors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xl)

            let remaining = max(depositAmount - totalPaid, 0)
            Text("Faltan \(remaining.asMXN) por cobrar.")
                .font(.callout)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.warning)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Missing Fields

    private func missingFieldsView(_ tokens: [String]) -> some View {
        VStack(spacing: Spacing.lg) {
            Spacer()

            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(SolennixColors.error)

            Text("Faltan datos para el contrato")
                .font(.title3)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)

            Text("Completa estos campos en el evento o cliente:")
                .font(.body)
                .foregroundStyle(SolennixColors.textSecondary)
                .multilineTextAlignment(.center)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                ForEach(tokens, id: \.self) { token in
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.error)
                        Text(token)
                            .font(.callout)
                            .foregroundStyle(SolennixColors.text)
                    }
                }
            }
            .padding(Spacing.md)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))

            Spacer()
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Contract Preview

    private func contractPreview(_ text: String, _ event: Event) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Contract text
                let paragraphs = text.components(separatedBy: "\n")
                ForEach(Array(paragraphs.enumerated()), id: \.offset) { _, paragraph in
                    let trimmed = paragraph.trimmingCharacters(in: .whitespaces)
                    if trimmed.isEmpty {
                        Spacer().frame(height: 8)
                    } else if isHeading(trimmed) {
                        Text(trimmed)
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundStyle(SolennixColors.text)
                            .padding(.top, Spacing.md)
                            .padding(.bottom, Spacing.xs)
                    } else {
                        Text(trimmed)
                            .font(.footnote)
                            .foregroundStyle(SolennixColors.text)
                            .lineSpacing(3)
                            .padding(.bottom, 2)
                    }
                }

                // Signature boxes
                signatureBoxes

                Spacer(minLength: Spacing.xl)
            }
            .padding(Spacing.lg)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
            .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
            .padding(Spacing.md)
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    sharePDF(event)
                } label: {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
    }

    // MARK: - Signature Boxes

    private var signatureBoxes: some View {
        HStack(spacing: Spacing.xl) {
            VStack(spacing: Spacing.sm) {
                Spacer().frame(height: 40)
                Divider()
                Text(profile?.businessName ?? profile?.name ?? "EL PROVEEDOR")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)
                Text("Firma")
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .frame(maxWidth: .infinity)

            VStack(spacing: Spacing.sm) {
                Spacer().frame(height: 40)
                Divider()
                Text(viewModel.client?.name ?? "EL CLIENTE")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)
                Text("Firma de EL CLIENTE")
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.top, Spacing.xxl)
    }

    // MARK: - Token Replacement

    private struct ContractRenderResult {
        let text: String
        let missingTokens: [String]
    }

    private func renderContract(_ event: Event) -> ContractRenderResult {
        let template = profile?.contractTemplate ?? Self.defaultTemplate
        let client = viewModel.client

        let depositPct = event.depositPercent ?? profile?.defaultDepositPercent ?? 0
        let depositAmt = event.totalAmount * (depositPct / 100)
        let cancellationDays = event.cancellationDays ?? profile?.defaultCancellationDays ?? 0
        let refundPct = event.refundPercent ?? profile?.defaultRefundPercent ?? 0

        let discountValue: Double
        if event.discountType == .percent {
            discountValue = event.totalAmount * (event.discount / 100) / max(1 - event.discount / 100 + event.taxRate / 100, 0.01)
        } else {
            discountValue = event.discount
        }

        let eventDateFormatted = Self.formatDate(event.eventDate)
        let todayFormatted = Self.formatDate(Date())

        let tokenMap: [(token: String, value: String?)] = [
            ("[Nombre del cliente]", client?.name),
            ("[Teléfono del cliente]", client?.phone),
            ("[Email del cliente]", client?.email),
            ("[Dirección del cliente]", client?.address),
            ("[Ciudad del cliente]", client?.city),
            ("[Fecha del evento]", eventDateFormatted),
            ("[Hora de inicio]", event.startTime),
            ("[Hora de fin]", event.endTime),
            ("[Horario del evento]", {
                if let s = event.startTime, let e = event.endTime { return "\(s) - \(e)" }
                return event.startTime ?? event.endTime
            }()),
            ("[Tipo de servicio]", event.serviceType),
            ("[Número de personas]", "\(event.numPeople)"),
            ("[Ubicación del evento]", event.location),
            ("[Ciudad del evento]", event.city),
            ("[Lugar del evento]", event.location),
            ("[Monto total del evento]", event.totalAmount.asMXN),
            ("[Subtotal del evento]", (event.totalAmount - event.taxAmount + discountValue).asMXN),
            ("[Descuento del evento]", discountValue.asMXN),
            ("[IVA del evento]", event.taxAmount.asMXN),
            ("[Porcentaje de anticipo]", "\(Int(depositPct))%"),
            ("[Monto de anticipo]", depositAmt.asMXN),
            ("[Total pagado]", totalPaid.asMXN),
            ("[Días de cancelación]", "\(Int(cancellationDays))"),
            ("[Porcentaje de reembolso]", "\(Int(refundPct))%"),
            ("[Nombre del negocio]", profile?.businessName ?? profile?.name),
            ("[Nombre comercial del proveedor]", profile?.businessName ?? profile?.name),
            ("[Nombre del proveedor]", profile?.name),
            ("[Email del proveedor]", profile?.email),
            ("[Fecha actual]", todayFormatted),
            ("[Ciudad del contrato]", event.city ?? client?.city),
            ("[Notas del evento]", event.notes),
            ("[Servicios del evento]", viewModel.eventProducts.map { "\($0.quantity) \($0.productName ?? "Producto")" }.joined(separator: ", ")),
        ]

        var result = template
        var missingTokens: [String] = []

        for (token, value) in tokenMap {
            if let value, !value.isEmpty {
                result = result.replacingOccurrences(of: token, with: value)
            } else if template.contains(token) {
                missingTokens.append(token)
            }
        }

        return ContractRenderResult(text: result, missingTokens: missingTokens)
    }

    // MARK: - PDF Export

    private func sharePDF(_ event: Event) {
        guard let client = viewModel.client else { return }
        let pdfData = ContractPDFGenerator.generate(event: event, client: client, profile: profile)
        let filename = "Contrato_\(client.name.replacingOccurrences(of: " ", with: "_")).pdf"
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        try? pdfData.write(to: tempURL)

        let activityVC = UIActivityViewController(activityItems: [tempURL], applicationActivities: nil)
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let root = scene.windows.first?.rootViewController {
            if let popover = activityVC.popoverPresentationController {
                popover.sourceView = root.view
                popover.sourceRect = CGRect(x: root.view.bounds.midX, y: root.view.bounds.midY, width: 0, height: 0)
            }
            root.present(activityVC, animated: true)
        }
    }

    // MARK: - Helpers

    private func isHeading(_ text: String) -> Bool {
        let uppercased = text.uppercased()
        return text == uppercased && text.count > 3 && text.count < 80
            || text.hasPrefix("PRIMERA")
            || text.hasPrefix("SEGUNDA")
            || text.hasPrefix("TERCERA")
            || text.hasPrefix("CUARTA")
            || text.hasPrefix("QUINTA")
            || text.hasPrefix("SEXTA")
            || text.hasPrefix("CLÁUSULA")
    }

    private static func formatDate(_ dateStr: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "es_MX")
        guard let date = formatter.date(from: String(dateStr.prefix(10))) else { return dateStr }
        let display = DateFormatter()
        display.dateFormat = "d 'de' MMMM, yyyy"
        display.locale = Locale(identifier: "es_MX")
        return display.string(from: date)
    }

    private static func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d 'de' MMMM, yyyy"
        formatter.locale = Locale(identifier: "es_MX")
        return formatter.string(from: date)
    }

    // MARK: - Default Template

    static let defaultTemplate = """
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
