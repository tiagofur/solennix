import SwiftUI
import PhotosUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Detail View (Hub)

public struct EventDetailView: View {

    let eventId: String

    @State private var viewModel: EventDetailViewModel
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var sizeClass

    public init(eventId: String, apiClient: APIClient) {
        self.eventId = eventId
        self._viewModel = State(initialValue: EventDetailViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.event == nil {
                ProgressView("Cargando evento...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let event = viewModel.event {
                scrollContent(event)
            } else {
                EmptyStateView(
                    icon: "exclamationmark.triangle",
                    title: "Error",
                    message: viewModel.errorMessage ?? "No se pudo cargar el evento"
                )
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Detalle del Evento")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    NavigationLink(value: Route.eventForm(id: eventId)) {
                        Label("Editar", systemImage: "pencil")
                    }

                    Divider()

                    Button(role: .destructive) {
                        viewModel.showDeleteConfirm = true
                    } label: {
                        Label("Eliminar Evento", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .confirmationDialog(
            "Cambiar estado",
            isPresented: $viewModel.showStatusSheet
        ) {
            Button("Cotizado") { Task { await viewModel.changeStatus(.quoted, eventId: eventId) } }
            Button("Confirmado") { Task { await viewModel.changeStatus(.confirmed, eventId: eventId) } }
            Button("Completado") { Task { await viewModel.changeStatus(.completed, eventId: eventId) } }
            Button("Cancelado", role: .destructive) { Task { await viewModel.changeStatus(.cancelled, eventId: eventId) } }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Selecciona el nuevo estado del evento")
        }
        .confirmationDialog(
            "Eliminar evento",
            isPresented: $viewModel.showDeleteConfirm
        ) {
            Button("Eliminar", role: .destructive) {
                Task {
                    let deleted = await viewModel.deleteEvent(eventId: eventId)
                    if deleted { dismiss() }
                }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Estas seguro de que quieres eliminar este evento? Esta accion no se puede deshacer.")
        }
        .sheet(isPresented: $viewModel.showPaymentSheet) {
            paymentSheet
        }
        .sheet(isPresented: $viewModel.showActionsMenu) {
            pdfActionsSheet
        }
        .task { await viewModel.loadData(eventId: eventId) }
    }

    // MARK: - Scroll Content (Hub Layout)

    private func scrollContent(_ event: Event) -> some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                AdaptiveDetailLayout {
                    // Left column: Header + Event Info + Content Cards
                    headerCard(event)
                    clientInfoCard(event)
                    if let notes = event.notes, !notes.isEmpty {
                        notesSection(notes)
                    }
                    contentCardsGrid(event)
                } right: {
                    // Right column: Finances + Payments + Actions
                    financeSummaryCard(event)
                    paymentSummaryCard(event)
                    actionButtonsRow1(event)
                    checklistCard
                    contractPreviewCard
                    actionButtonsRow3
                }

                // Full-width: Photos preview + Live Activity
                photosPreviewCard

                liveActivityButton
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
        .refreshable { await viewModel.loadData(eventId: eventId) }
    }

    // MARK: - Header Card

    private func headerCard(_ event: Event) -> some View {
        VStack(spacing: Spacing.md) {
            HStack(spacing: Spacing.md) {
                dateBox(event.eventDate)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(event.serviceType)
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    if let client = viewModel.client {
                        Text(client.name)
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }

                    Button {
                        viewModel.showStatusSheet = true
                    } label: {
                        StatusBadge(status: event.status.rawValue)
                    }
                }

                Spacer()
            }

            // Quick info grid
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: Spacing.sm) {
                quickInfoItem(icon: "calendar", label: "Fecha", value: formatDateShort(event.eventDate))

                if let startTime = event.startTime {
                    let timeText = [startTime, event.endTime].compactMap { $0 }.joined(separator: " - ")
                    quickInfoItem(icon: "clock", label: "Horario", value: timeText)
                }

                quickInfoItem(icon: "person.2", label: "Personas", value: "\(event.numPeople) PAX")

                if let location = event.location, !location.isEmpty {
                    let fullLocation = [location, event.city].compactMap { $0?.isEmpty == true ? nil : $0 }.joined(separator: ", ")
                    quickInfoItem(icon: "mappin", label: "Ubicacion", value: fullLocation)
                } else if let city = event.city, !city.isEmpty {
                    quickInfoItem(icon: "mappin", label: "Ciudad", value: city)
                }
            }
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }

    private func quickInfoItem(icon: String, label: String, value: String) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(SolennixColors.primary)
                .frame(width: 16)

            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textTertiary)
                    .textCase(.uppercase)

                Text(value)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)
                    .lineLimit(1)
            }

            Spacer()
        }
    }

    // MARK: - Client Info Card

    private func clientInfoCard(_ event: Event) -> some View {
        Group {
            if let client = viewModel.client {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "person.circle.fill")
                            .font(.title2)
                            .foregroundStyle(SolennixColors.primary)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(client.name)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundStyle(SolennixColors.text)

                            if let city = client.city, !city.isEmpty {
                                Text(city)
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textSecondary)
                            }
                        }

                        Spacer()
                    }

                    HStack(spacing: Spacing.lg) {
                        if !client.phone.isEmpty {
                            Label(client.phone, systemImage: "phone")
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }

                        if let email = client.email, !email.isEmpty {
                            Label(email, systemImage: "envelope")
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textSecondary)
                                .lineLimit(1)
                        }
                    }
                }
                .padding(Spacing.md)
                .background(SolennixColors.card)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                .shadowSm()
            }
        }
    }

    // MARK: - Finance Summary Card (navigable)

    private func financeSummaryCard(_ event: Event) -> some View {
        NavigationLink(value: Route.eventFinances(id: eventId)) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Image(systemName: "chart.bar.fill")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)

                    Text("Finanzas")
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }

                Divider().background(SolennixColors.border)

                HStack(spacing: Spacing.md) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("TOTAL")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                            .textCase(.uppercase)
                        Text(event.totalAmount.asMXN)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundStyle(SolennixColors.primary)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text("UTILIDAD")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                            .textCase(.uppercase)

                        let supplyCost = viewModel.supplies.reduce(0.0) { $0 + ($1.quantity * $1.unitCost) }
                        let netSales = event.totalAmount - event.taxAmount
                        let profit = netSales - supplyCost
                        let margin = netSales > 0 ? (profit / netSales) * 100 : 0

                        Text("\(String(format: "%.0f", margin))%")
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundStyle(SolennixColors.success)
                    }
                }

                if event.discount > 0 {
                    let discountLabel = event.discountType == .percent
                        ? "Descuento \(Int(event.discount))%"
                        : "Descuento"
                    Text(discountLabel)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.error)
                }

                if event.requiresInvoice {
                    Text("IVA \(Int(event.taxRate))%")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            .padding(Spacing.lg)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
            .shadowSm()
        }
        .buttonStyle(.plain)
    }

    // MARK: - Payment Summary Card (navigable)

    private func paymentSummaryCard(_ event: Event) -> some View {
        NavigationLink(value: Route.eventPayments(id: eventId)) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Image(systemName: "dollarsign.circle.fill")
                        .font(.body)
                        .foregroundStyle(SolennixColors.success)

                    Text("Pagos")
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    Spacer()

                    Text("\(viewModel.payments.count)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.primary)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, 2)
                        .background(SolennixColors.primaryLight)
                        .clipShape(Capsule())

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }

                Divider().background(SolennixColors.border)

                // Mini KPIs
                HStack(spacing: Spacing.sm) {
                    miniKpi(
                        label: "Pagado",
                        value: viewModel.totalPaid.asMXN,
                        color: SolennixColors.success,
                        bgColor: SolennixColors.successBg
                    )
                    miniKpi(
                        label: "Saldo",
                        value: viewModel.remaining.asMXN,
                        color: viewModel.isFullyPaid ? SolennixColors.success : SolennixColors.error,
                        bgColor: viewModel.isFullyPaid ? SolennixColors.successBg : SolennixColors.errorBg
                    )
                }

                // Progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(SolennixColors.surfaceAlt)
                            .frame(height: 6)

                        RoundedRectangle(cornerRadius: 4)
                            .fill(SolennixColors.primary)
                            .frame(width: geo.size.width * viewModel.progress / 100, height: 6)
                    }
                }
                .frame(height: 6)

                HStack {
                    Spacer()
                    Text("\(String(format: "%.0f", viewModel.progress))%")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.textSecondary)
                }

                // Deposit status
                if let depositPercent = event.depositPercent, depositPercent > 0 {
                    let depositAmount = event.totalAmount * (depositPercent / 100)
                    let isDepositMet = viewModel.totalPaid >= (depositAmount - 0.1)
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: isDepositMet ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                            .font(.caption)
                            .foregroundStyle(isDepositMet ? SolennixColors.success : SolennixColors.warning)
                        Text("Anticipo \(Int(depositPercent))%: \(depositAmount.asMXN)")
                            .font(.caption)
                            .foregroundStyle(isDepositMet ? SolennixColors.success : SolennixColors.warning)
                    }
                }
            }
            .padding(Spacing.lg)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
            .shadowSm()
        }
        .buttonStyle(.plain)
    }

    // MARK: - Content Cards Grid

    private func contentCardsGrid(_ event: Event) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: Spacing.sm) {
            summaryNavCard(
                icon: "bag.fill",
                title: "Productos",
                count: viewModel.products.count,
                color: SolennixColors.primary,
                route: Route.eventProducts(id: eventId)
            )

            summaryNavCard(
                icon: "sparkles",
                title: "Extras",
                count: viewModel.extras.count,
                color: SolennixColors.info,
                route: Route.eventExtras(id: eventId)
            )

            summaryNavCard(
                icon: "drop.fill",
                title: "Insumos",
                count: viewModel.supplies.count,
                color: SolennixColors.warning,
                route: Route.eventSupplies(id: eventId)
            )

            summaryNavCard(
                icon: "wrench.and.screwdriver.fill",
                title: "Equipo",
                count: viewModel.equipment.count,
                color: SolennixColors.success,
                route: Route.eventEquipment(id: eventId)
            )

            summaryNavCard(
                icon: "cart.fill",
                title: "Compras",
                subtitle: shoppingListSubtitle,
                color: SolennixColors.error,
                route: Route.eventShoppingList(id: eventId)
            )

            NavigationLink(value: Route.eventPhotos(id: eventId)) {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack {
                        Image(systemName: "camera.fill")
                            .font(.body)
                            .foregroundStyle(.purple)

                        Spacer()

                        if !viewModel.eventPhotos.isEmpty {
                            Text("\(viewModel.eventPhotos.count)")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundStyle(.purple)
                                .padding(.horizontal, Spacing.sm)
                                .padding(.vertical, 2)
                                .background(Color.purple.opacity(0.1))
                                .clipShape(Capsule())
                        }
                    }

                    Text("Fotos")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)

                    Image(systemName: "chevron.right")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .padding(Spacing.md)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(SolennixColors.card)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                .shadowSm()
            }
            .buttonStyle(.plain)
        }
    }

    private func summaryNavCard(icon: String, title: String, count: Int? = nil, subtitle: String? = nil, color: Color, route: Route) -> some View {
        NavigationLink(value: route) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Image(systemName: icon)
                        .font(.body)
                        .foregroundStyle(color)

                    Spacer()

                    if let count, count > 0 {
                        Text("\(count)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(color)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, 2)
                            .background(color.opacity(0.1))
                            .clipShape(Capsule())
                    }
                }

                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .lineLimit(1)
                } else {
                    Image(systemName: "chevron.right")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }
            .padding(Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
            .shadowSm()
        }
        .buttonStyle(.plain)
    }

    private var shoppingListSubtitle: String? {
        let purchaseCount = viewModel.supplies.filter { $0.source == .purchase }.count
        if purchaseCount > 0 {
            return "\(purchaseCount) por comprar"
        }
        return nil
    }

    // MARK: - Photos Preview Card

    @ViewBuilder
    private var photosPreviewCard: some View {
        if !viewModel.eventPhotos.isEmpty {
            NavigationLink(value: Route.eventPhotos(id: eventId)) {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack {
                        Text("Fotos")
                            .font(.headline)
                            .foregroundStyle(SolennixColors.text)
                        Spacer()
                        Text("\(viewModel.eventPhotos.count)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(.purple)
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }

                    HStack(spacing: Spacing.sm) {
                        ForEach(Array(viewModel.eventPhotos.prefix(4).enumerated()), id: \.offset) { index, url in
                            AsyncImage(url: APIClient.resolveURL(url)) { image in
                                image
                                    .resizable()
                                    .scaledToFill()
                            } placeholder: {
                                ProgressView()
                                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                                    .background(SolennixColors.surfaceAlt)
                            }
                            .frame(height: 60)
                            .frame(maxWidth: .infinity)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                            .overlay {
                                if index == 3 && viewModel.eventPhotos.count > 4 {
                                    RoundedRectangle(cornerRadius: CornerRadius.sm)
                                        .fill(.black.opacity(0.5))
                                    Text("+\(viewModel.eventPhotos.count - 4)")
                                        .font(.caption)
                                        .fontWeight(.bold)
                                        .foregroundStyle(.white)
                                }
                            }
                        }
                    }
                }
                .padding(Spacing.md)
                .background(SolennixColors.card)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                .shadowSm()
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Checklist Card

    private var checklistCard: some View {
        NavigationLink(value: Route.eventChecklist(id: eventId)) {
            HStack {
                Image(systemName: "checklist")
                    .font(.body)
                Text("Checklist de Carga")
                    .font(.body)
                    .fontWeight(.medium)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .foregroundStyle(SolennixColors.primary)
            .padding(Spacing.md)
            .frame(maxWidth: .infinity)
            .background(SolennixColors.primaryLight)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        }
        .buttonStyle(.plain)
    }

    private var contractPreviewCard: some View {
        NavigationLink(value: Route.eventContractPreview(id: eventId)) {
            HStack {
                Image(systemName: "doc.richtext")
                    .font(.body)
                Text("Ver Contrato")
                    .font(.body)
                    .fontWeight(.medium)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .foregroundStyle(SolennixColors.info)
            .padding(Spacing.md)
            .frame(maxWidth: .infinity)
            .background(SolennixColors.info.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Action Buttons Row 1 (Payments)

    private func actionButtonsRow1(_ event: Event) -> some View {
        Group {
            if viewModel.remaining > 0.01 {
                HStack(spacing: Spacing.sm) {
                    PremiumButton(title: "Registrar Pago", fullWidth: true) {
                        viewModel.showPaymentSheet = true
                    }

                    PremiumButton(title: "Liquidar \(viewModel.remaining.asMXN)", fullWidth: true) {
                        viewModel.payRemaining()
                    }
                }
            }
        }
    }

    // MARK: - Live Activity Button

    @ViewBuilder
    private var liveActivityButton: some View {
        if viewModel.canStartLiveActivity || viewModel.isLiveActivityActive {
            Button {
                if viewModel.isLiveActivityActive {
                    Task { await viewModel.stopLiveActivity() }
                } else {
                    viewModel.startLiveActivity()
                }
            } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: viewModel.isLiveActivityActive ? "stop.circle.fill" : "dot.radiowaves.left.and.right")
                        .font(.body)
                        .foregroundStyle(viewModel.isLiveActivityActive ? SolennixColors.error : .white)
                        .symbolEffect(.pulse, isActive: viewModel.isLiveActivityActive)

                    Text(viewModel.isLiveActivityActive ? "Detener Actividad en Vivo" : "Iniciar Actividad en Vivo")
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(viewModel.isLiveActivityActive ? SolennixColors.error : .white)

                    Spacer()

                    if viewModel.isLiveActivityActive {
                        Circle()
                            .fill(SolennixColors.success)
                            .frame(width: 8, height: 8)
                    }
                }
                .padding(Spacing.md)
                .frame(maxWidth: .infinity)
                .background(
                    viewModel.isLiveActivityActive
                        ? SolennixColors.errorBg
                        : SolennixColors.success
                )
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Action Buttons Row 3 (PDF, Edit)

    private var actionButtonsRow3: some View {
        HStack(spacing: Spacing.sm) {
            Button {
                viewModel.showActionsMenu = true
            } label: {
                actionButton(icon: "doc.text", label: "Generar PDF", fg: SolennixColors.primary)
            }

            NavigationLink(value: Route.eventForm(id: eventId)) {
                actionButton(icon: "pencil", label: "Editar", fg: SolennixColors.info)
            }
        }
    }

    private func actionButton(icon: String, label: String, fg: Color) -> some View {
        VStack(spacing: Spacing.xs) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(fg)

            Text(label)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
    }

    // MARK: - Notes Section

    private func notesSection(_ notes: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "note.text")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.primary)
                Text("Notas")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            Text(notes)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
                .lineLimit(3)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
    }

    // MARK: - Mini KPI

    private func miniKpi(label: String, value: String, color: Color, bgColor: Color) -> some View {
        VStack(spacing: Spacing.xs) {
            Text(value)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(label)
                .font(.caption2)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.sm)
        .background(bgColor)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    // MARK: - Date Box

    private func dateBox(_ dateString: String) -> some View {
        let components = parseDateComponents(dateString)
        return VStack(spacing: Spacing.xxs) {
            Text(components.month)
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.primary)
                .textCase(.uppercase)

            Text(components.day)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)
        }
        .frame(width: 56, height: 56)
        .background(SolennixColors.primaryLight)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    // MARK: - Payment Sheet

    private var paymentSheet: some View {
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                Text("Registrar Pago")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Monto")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    TextField("0.00", text: $viewModel.paymentAmount)
                        .keyboardType(.decimalPad)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.text)
                        .padding(Spacing.md)
                        .background(SolennixColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Metodo de pago")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    HStack(spacing: Spacing.sm) {
                        ForEach(paymentMethods, id: \.key) { method in
                            Button {
                                viewModel.paymentMethod = method.key
                            } label: {
                                Text(method.label)
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundStyle(
                                        viewModel.paymentMethod == method.key
                                            ? .white
                                            : SolennixColors.text
                                    )
                                    .padding(.horizontal, Spacing.md)
                                    .padding(.vertical, Spacing.sm)
                                    .background(
                                        viewModel.paymentMethod == method.key
                                            ? SolennixColors.primary
                                            : SolennixColors.surface
                                    )
                                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Notas (opcional)")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    TextField("Notas del pago", text: $viewModel.paymentNotes)
                        .font(.body)
                        .foregroundStyle(SolennixColors.text)
                        .padding(Spacing.md)
                        .background(SolennixColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }

                Spacer()

                PremiumButton(
                    title: "Guardar Pago",
                    isLoading: viewModel.isSavingPayment,
                    isDisabled: viewModel.paymentAmount.isEmpty
                ) {
                    Task { await viewModel.addPayment(eventId: eventId) }
                }
            }
            .padding(Spacing.lg)
            .background(SolennixColors.background)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") {
                        viewModel.showPaymentSheet = false
                    }
                    .foregroundStyle(SolennixColors.primary)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - PDF Actions Sheet

    private var pdfActionsSheet: some View {
        NavigationStack {
            VStack(spacing: Spacing.sm) {
                Text("Generar PDF")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)
                    .padding(.bottom, Spacing.sm)

                ForEach(pdfOptions, id: \.key) { option in
                    Button {
                        viewModel.generatingPdf = option.key
                        viewModel.showActionsMenu = false
                    } label: {
                        HStack(spacing: Spacing.md) {
                            Image(systemName: option.icon)
                                .font(.body)
                                .foregroundStyle(SolennixColors.primary)
                                .frame(width: 32)

                            Text(option.label)
                                .font(.body)
                                .foregroundStyle(SolennixColors.text)

                            Spacer()

                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textTertiary)
                        }
                        .padding(Spacing.md)
                        .background(SolennixColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }
                    .buttonStyle(.plain)
                }

                Spacer()
            }
            .padding(Spacing.lg)
            .background(SolennixColors.background)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cerrar") {
                        viewModel.showActionsMenu = false
                    }
                    .foregroundStyle(SolennixColors.primary)
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - Helpers

    private func formatDateShort(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "es_MX")

        guard let date = formatter.date(from: String(dateString.prefix(10))) else {
            return dateString
        }

        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "d MMM yyyy"
        displayFormatter.locale = Locale(identifier: "es_MX")
        return displayFormatter.string(from: date)
    }

    private func parseDateComponents(_ dateString: String) -> (month: String, day: String) {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "es_MX")

        guard let date = formatter.date(from: String(dateString.prefix(10))) else {
            return ("---", "--")
        }

        let monthFormatter = DateFormatter()
        monthFormatter.dateFormat = "MMM"
        monthFormatter.locale = Locale(identifier: "es_MX")

        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "d"

        return (monthFormatter.string(from: date), dayFormatter.string(from: date))
    }

    private var paymentMethods: [(key: String, label: String)] {
        [
            ("efectivo", "Efectivo"),
            ("transferencia", "Transferencia"),
            ("tarjeta", "Tarjeta"),
            ("cheque", "Cheque"),
        ]
    }

    private var pdfOptions: [(key: String, label: String, icon: String)] {
        [
            ("cotizacion", "Cotizacion", "doc.text"),
            ("contrato", "Contrato", "doc.richtext"),
            ("insumos", "Lista de Insumos", "list.clipboard"),
            ("equipo", "Lista de Equipo", "wrench.and.screwdriver"),
            ("checklist", "Checklist", "checklist"),
            ("pagos", "Pagos", "dollarsign.circle"),
            ("factura", "Factura", "doc.badge.arrow.up"),
        ]
    }
}

// MARK: - Preview

#Preview("Event Detail") {
    NavigationStack {
        EventDetailView(eventId: "123", apiClient: APIClient())
    }
}
