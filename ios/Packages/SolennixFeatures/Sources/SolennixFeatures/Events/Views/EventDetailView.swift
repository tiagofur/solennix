import SwiftUI
import PhotosUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Detail View (Hub)

public struct EventDetailView: View {

    let eventId: String
    private let apiClient: APIClient

    @State private var viewModel: EventDetailViewModel
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var showDuplicateSheet = false
    @State private var duplicateViewModel: EventFormViewModel?
    @State private var showClientPortalSheet = false
    @Environment(AuthManager.self) private var authManager
    @Environment(ToastManager.self) private var toastManager
    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var sizeClass

    public init(eventId: String, apiClient: APIClient) {
        self.eventId = eventId
        self.apiClient = apiClient
        self._viewModel = State(initialValue: EventDetailViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.event == nil {
                ProgressView(tr("events.detail.loading", "Cargando evento..."))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let event = viewModel.event {
                scrollContent(event)
            } else {
                EmptyStateView(
                    icon: "exclamationmark.triangle",
                    title: tr("events.detail.error.title", "Error"),
                    message: viewModel.errorMessage ?? tr("events.detail.error.load_fallback", "No se pudo cargar el evento")
                )
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(tr("events.detail.title", "Detalle del evento"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    NavigationLink(value: Route.eventForm(id: eventId)) {
                        Label(tr("events.detail.action.edit", "Editar"), systemImage: "pencil")
                    }

                    Button {
                        duplicateEvent()
                    } label: {
                        Label(tr("events.detail.action.duplicate", "Duplicar evento"), systemImage: "doc.on.doc")
                    }

                    Divider()

                    Button(role: .destructive) {
                        viewModel.showDeleteConfirm = true
                    } label: {
                        Label(tr("events.detail.action.delete", "Eliminar evento"), systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .accessibilityLabel(tr("events.detail.action.more", "Acciones del evento"))
                }
            }
        }
        .confirmationDialog(
            tr("events.detail.status.change_title", "Cambiar estado"),
            isPresented: $viewModel.showStatusSheet
        ) {
            Button(tr("events.detail.status.quoted", "Cotizado")) { Task { await viewModel.changeStatus(.quoted, eventId: eventId) } }
            Button(tr("events.detail.status.confirmed", "Confirmado")) { Task { await viewModel.changeStatus(.confirmed, eventId: eventId) } }
            Button(tr("events.detail.status.completed", "Completado")) { Task { await viewModel.changeStatus(.completed, eventId: eventId) } }
            Button(tr("events.detail.status.cancelled", "Cancelado"), role: .destructive) { Task { await viewModel.changeStatus(.cancelled, eventId: eventId) } }
            Button(tr("events.form.cancel", "Cancelar"), role: .cancel) {}
        } message: {
            Text(tr("events.detail.status.change_message", "Selecciona el nuevo estado del evento"))
        }
        .confirmationDialog(
            tr("events.detail.delete.title", "Eliminar evento"),
            isPresented: $viewModel.showDeleteConfirm
        ) {
            Button(tr("events.detail.delete.confirm", "Eliminar"), role: .destructive) {
                Task {
                    let deleted = await viewModel.deleteEvent(eventId: eventId)
                    if deleted { dismiss() }
                }
            }
            Button(tr("events.form.cancel", "Cancelar"), role: .cancel) {}
        } message: {
            Text(tr("events.detail.delete.message", "Estas seguro de que quieres eliminar este evento? Esta accion no se puede deshacer."))
        }
        .sheet(isPresented: $viewModel.showPaymentSheet) {
            paymentSheet
        }
        .task { await viewModel.loadData(eventId: eventId) }
        .sheet(isPresented: $showDuplicateSheet) {
            if let vm = duplicateViewModel {
                NavigationStack {
                    EventFormView(prefilledViewModel: vm)
                }
            }
        }
        .sheet(isPresented: $showClientPortalSheet) {
            ClientPortalShareSheet(apiClient: apiClient, eventId: eventId)
                .presentationDetents([.medium, .large])
        }
    }

    // MARK: - Scroll Content (Hub Layout)

    private func scrollContent(_ event: Event) -> some View {
        let isRegularWidth = sizeClass == .regular

        return ScrollView {
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
                    clientPortalCard
                    documentsCard(event)
                    actionButtonsRow3
                }

                // Full-width: Photos preview + Live Activity
                photosPreviewCard

                liveActivityButton
            }
            .padding(.horizontal, isRegularWidth ? Spacing.xxl : Spacing.md)
            .padding(.vertical, isRegularWidth ? Spacing.xxl : Spacing.lg)
        }
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
        .refreshable { await viewModel.loadData(eventId: eventId) }
    }

    // MARK: - Header Card

    private func headerCard(_ event: Event) -> some View {
        let components = parseDateComponents(event.eventDate)

        VStack(spacing: Spacing.md) {
            HStack(spacing: Spacing.md) {
                EventDetailDateBox(month: components.month, day: components.day)

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
                EventDetailQuickInfoItem(icon: "calendar", label: tr("events.detail.info.date", "Fecha"), value: formatDateShort(event.eventDate))

                if let startTime = event.startTime {
                    let timeText = [startTime, event.endTime].compactMap { $0 }.joined(separator: " - ")
                    EventDetailQuickInfoItem(icon: "clock", label: tr("events.detail.info.schedule", "Horario"), value: timeText)
                }

                EventDetailQuickInfoItem(
                    icon: "person.2",
                    label: tr("events.detail.info.people", "Personas"),
                    value: trf("events.detail.info.people_value", "%@ PAX", String(event.numPeople))
                )

                if let location = event.location, !location.isEmpty {
                    let fullLocation = [location, event.city].compactMap { $0?.isEmpty == true ? nil : $0 }.joined(separator: ", ")
                    EventDetailQuickInfoItem(icon: "mappin", label: tr("events.detail.info.location", "Ubicación"), value: fullLocation)
                } else if let city = event.city, !city.isEmpty {
                    EventDetailQuickInfoItem(icon: "mappin", label: tr("events.detail.info.city", "Ciudad"), value: city)
                }
            }
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
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

                    Text(tr("events.detail.card.finances", "Finanzas"))
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
                        Text(tr("events.detail.finances.total", "Total"))
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
                        Text(tr("events.detail.finances.profit", "Utilidad"))
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
                        ? trf("events.detail.finances.discount_percent", "Descuento %@%%", String(Int(event.discount)))
                        : tr("events.detail.finances.discount", "Descuento")
                    Text(discountLabel)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.error)
                }

                if event.requiresInvoice {
                    Text(trf("events.detail.finances.tax", "IVA %@%%", String(Int(event.taxRate))))
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

                    Text(tr("events.detail.card.payments", "Pagos"))
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
                    EventDetailMiniKPI(
                        label: tr("events.detail.payments.kpi.paid", "Pagado"),
                        value: viewModel.totalPaid.asMXN,
                        color: SolennixColors.success,
                        bgColor: SolennixColors.successBg
                    )
                    EventDetailMiniKPI(
                        label: tr("events.detail.payments.kpi.balance", "Saldo"),
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
                        Text(trf2("events.detail.payments.deposit_card", "Anticipo %@%%: %@", String(Int(depositPercent)), depositAmount.asMXN))
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
            EventDetailSummaryNavCard(
                icon: "bag.fill",
                title: tr("events.detail.card.products", "Productos"),
                count: viewModel.products.count,
                color: SolennixColors.primary,
                route: Route.eventProducts(id: eventId)
            )

            EventDetailSummaryNavCard(
                icon: "sparkles",
                title: tr("events.detail.card.extras", "Extras"),
                count: viewModel.extras.count,
                color: SolennixColors.info,
                route: Route.eventExtras(id: eventId)
            )

            EventDetailSummaryNavCard(
                icon: "drop.fill",
                title: tr("events.detail.card.supplies", "Insumos"),
                count: viewModel.supplies.count,
                color: SolennixColors.warning,
                route: Route.eventSupplies(id: eventId)
            )

            EventDetailSummaryNavCard(
                icon: "wrench.and.screwdriver.fill",
                title: tr("events.detail.card.equipment", "Equipo"),
                count: viewModel.equipment.count,
                color: SolennixColors.success,
                route: Route.eventEquipment(id: eventId)
            )

            EventDetailSummaryNavCard(
                icon: "cart.fill",
                title: tr("events.detail.card.shopping", "Compras"),
                subtitle: shoppingListSubtitle,
                color: SolennixColors.error,
                route: Route.eventShoppingList(id: eventId)
            )

            EventDetailSummaryNavCard(
                icon: "person.3.fill",
                title: tr("events.detail.card.staff", "Personal"),
                count: viewModel.eventStaff.count,
                color: SolennixColors.info,
                route: Route.eventStaff(id: eventId)
            )

            EventDetailPhotosSummaryCard(
                title: tr("events.detail.card.photos", "Fotos"),
                count: viewModel.eventPhotos.count,
                route: Route.eventPhotos(id: eventId)
            )
        }
    }

    private var shoppingListSubtitle: String? {
        let purchaseCount = viewModel.supplies.filter { $0.source == .purchase }.count
        if purchaseCount > 0 {
            return trf("events.detail.shopping.pending_count", "%@ por comprar", String(purchaseCount))
        }
        return nil
    }

    // MARK: - Photos Preview Card

    @ViewBuilder
    private var photosPreviewCard: some View {
        if !viewModel.eventPhotos.isEmpty {
            EventDetailPhotosPreviewCard(
                title: tr("events.detail.card.photos", "Fotos"),
                photos: viewModel.eventPhotos,
                route: Route.eventPhotos(id: eventId)
            )
        }
    }

    // MARK: - Checklist Card

    private var checklistCard: some View {
        NavigationLink(value: Route.eventChecklist(id: eventId)) {
            HStack {
                Image(systemName: "checklist")
                    .font(.body)
                Text(tr("events.detail.card.checklist", "Checklist de carga"))
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
                Text(tr("events.detail.card.contract", "Ver contrato"))
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

    // MARK: - Client Portal Card (PRD/12 feature A)

    /// Opens a sheet that lets the organizer generate, copy, share, rotate
    /// or revoke the client-portal share link for this event.
    private var clientPortalCard: some View {
        Button {
            showClientPortalSheet = true
        } label: {
            HStack {
                Image(systemName: "person.2.circle")
                    .font(.body)
                Text(tr("events.detail.share.title", "Portal del cliente"))
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

    // MARK: - Action Buttons Row 1 (Payments)

    private func actionButtonsRow1(_ event: Event) -> some View {
        Group {
            if viewModel.remaining > 0.01 {
                VStack(spacing: Spacing.sm) {
                    HStack(spacing: Spacing.sm) {
                        PremiumButton(title: tr("events.detail.payments.action.record", "Registrar pago"), fullWidth: true) {
                            viewModel.showPaymentSheet = true
                        }

                        PremiumButton(title: trf("events.detail.payments.action.settle", "Liquidar %@", viewModel.remaining.asMXN), fullWidth: true) {
                            viewModel.payRemaining()
                        }
                    }

                    if let depositPct = event.depositPercent, depositPct > 0, viewModel.depositBalance > 0.01 {
                        // Titulo corto — el porcentaje ya se ve en la card
                        // "Anticipo X%" arriba. Evita truncado en iPhone mini.
                        PremiumButton(title: trf("events.detail.payments.action.deposit", "Anticipo %@", viewModel.depositBalance.asMXN), fullWidth: true) {
                            viewModel.payDeposit()
                        }
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

                    Text(viewModel.isLiveActivityActive ? tr("events.detail.live_activity.stop", "Detener actividad en vivo") : tr("events.detail.live_activity.start", "Iniciar actividad en vivo"))
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

    // MARK: - Action Buttons Row 3 (Edit)

    private var actionButtonsRow3: some View {
        NavigationLink(value: Route.eventForm(id: eventId)) {
            actionButton(icon: "pencil", label: tr("events.detail.action.edit_event", "Editar evento"), fg: SolennixColors.info)
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
                Text(tr("events.detail.notes", "Notas"))
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

    // MARK: - Payment Sheet

    private var paymentSheet: some View {
        EventDetailPaymentSheetContent(
            amount: $viewModel.paymentAmount,
            method: $viewModel.paymentMethod,
            notes: $viewModel.paymentNotes,
            title: tr("events.detail.payments.sheet.title", "Registrar pago"),
            amountLabel: tr("events.detail.payments.sheet.amount", "Monto"),
            methodLabel: tr("events.detail.payments.sheet.method", "Metodo de pago"),
            notesLabel: tr("events.detail.payments.sheet.notes_optional", "Notas (opcional)"),
            notesPlaceholder: tr("events.detail.payments.sheet.notes_placeholder", "Notas del pago"),
            saveLabel: tr("events.detail.payments.sheet.save", "Guardar pago"),
            cancelLabel: tr("events.form.cancel", "Cancelar"),
            methods: paymentMethods,
            isSaving: viewModel.isSavingPayment,
            isSaveDisabled: viewModel.paymentAmount.isEmpty,
            onSave: {
                Task { await viewModel.addPayment(eventId: eventId) }
            },
            onCancel: {
                viewModel.showPaymentSheet = false
            }
        )
    }

    // MARK: - Documents Grid Card

    private func documentsCard(_ event: Event) -> some View {
        EventDetailDocumentsCard(
            title: tr("events.detail.documents.title", "Generar documentos"),
            options: pdfOptions,
            onTap: { key in
                Task { await generateAndSharePDF(key: key, event: event) }
            }
        )
    }

    // MARK: - Helpers

    private func formatDateShort(_ dateString: String) -> String {
        guard let date = Date.fromServerDay(dateString) else { return dateString }
        return date.formatted(style: "d MMM yyyy")
    }

    private func parseDateComponents(_ dateString: String) -> (month: String, day: String) {
        guard let date = Date.fromServerDay(dateString) else {
            return ("---", "--")
        }
        return (date.formatted(style: "MMM"), date.formatted(style: "d"))
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    private func trf(_ key: String, _ value: String, _ arg: String) -> String {
        String(format: tr(key, value), locale: FeatureL10n.locale, arg)
    }

    private func trf2(_ key: String, _ value: String, _ arg1: String, _ arg2: String) -> String {
        String(format: tr(key, value), locale: FeatureL10n.locale, arg1, arg2)
    }

    private var paymentMethods: [(key: String, label: String)] {
        [
            ("cash", tr("events.detail.payments.method.cash", "Efectivo")),
            ("transfer", tr("events.detail.payments.method.transfer", "Transferencia")),
            ("card", tr("events.detail.payments.method.card", "Tarjeta")),
            ("check", tr("events.detail.payments.method.check", "Cheque")),
        ]
    }

    private var pdfOptions: [(key: String, label: String, icon: String)] {
        EventDetailDocumentExport.options.map { option in
            (option.key, tr(option.labelKey, option.defaultLabel), option.icon)
        }
    }

    // MARK: - PDF Download & Share

    private func generateAndSharePDF(key: String, event: Event) async {
        guard let resolved = EventDetailDocumentExport.resolve(
            for: key,
            eventServiceType: event.serviceType,
            clientName: viewModel.client?.name,
            localize: tr,
            locale: FeatureL10n.locale
        ) else {
            return
        }

        do {
            let tempURL = try await EventPDFFileService.download(
                apiClient: apiClient,
                eventId: eventId,
                type: resolved.pdfType,
                filename: resolved.filename
            )
            try await MainActor.run {
                try EventPDFFileService.presentShareSheet(fileURL: tempURL)
            }
        } catch {
            toastManager.show(message: tr("events.detail.error.save_pdf", "No se pudo generar el PDF"), type: .error)
        }
    }

    // MARK: - Duplicate Event

    private func duplicateEvent() {
        guard let event = viewModel.event else { return }
        HapticsHelper.play(.selection)
        let vm = EventFormViewModel(apiClient: apiClient)
        vm.prefill(
            from: event,
            products: viewModel.products,
            extras: viewModel.extras,
            equipment: viewModel.equipment,
            supplies: viewModel.supplies
        )
        duplicateViewModel = vm
        showDuplicateSheet = true
    }

}

// MARK: - Preview

#Preview("Event Detail") {
    NavigationStack {
        EventDetailView(eventId: "123", apiClient: APIClient())
    }
}
