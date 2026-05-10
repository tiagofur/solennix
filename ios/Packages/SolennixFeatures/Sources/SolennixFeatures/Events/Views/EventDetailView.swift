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
        let scheduleText = event.startTime.map { [ $0, event.endTime ].compactMap { $0 }.joined(separator: " - ") }
        let locationLabel: String?
        let locationValue: String?

        if let location = event.location, !location.isEmpty {
            locationLabel = tr("events.detail.info.location", "Ubicación")
            locationValue = [location, event.city].compactMap { value in
                guard let value, !value.isEmpty else { return nil }
                return value
            }.joined(separator: ", ")
        } else if let city = event.city, !city.isEmpty {
            locationLabel = tr("events.detail.info.city", "Ciudad")
            locationValue = city
        } else {
            locationLabel = nil
            locationValue = nil
        }

        return EventDetailHeaderCard(
            event: event,
            clientName: viewModel.client?.name,
            month: components.month,
            day: components.day,
            dateLabel: tr("events.detail.info.date", "Fecha"),
            dateValue: formatDateShort(event.eventDate),
            scheduleLabel: tr("events.detail.info.schedule", "Horario"),
            scheduleValue: scheduleText,
            peopleLabel: tr("events.detail.info.people", "Personas"),
            peopleValue: trf("events.detail.info.people_value", "%@ PAX", String(event.numPeople)),
            locationLabel: locationLabel,
            locationValue: locationValue,
            onStatusTap: { viewModel.showStatusSheet = true }
        )
    }

    // MARK: - Client Info Card

    private func clientInfoCard(_ event: Event) -> some View {
        Group {
            if let client = viewModel.client {
                EventDetailClientInfoCard(client: client)
            }
        }
    }

    // MARK: - Finance Summary Card (navigable)

    private func financeSummaryCard(_ event: Event) -> some View {
        let supplyCost = viewModel.supplies.reduce(0.0) { $0 + ($1.quantity * $1.unitCost) }
        let netSales = event.totalAmount - event.taxAmount
        let profit = netSales - supplyCost
        let margin = netSales > 0 ? (profit / netSales) * 100 : 0
        let discountText = event.discount > 0
            ? (event.discountType == .percent
                ? trf("events.detail.finances.discount_percent", "Descuento %@%%", String(Int(event.discount)))
                : tr("events.detail.finances.discount", "Descuento"))
            : nil
        let taxText = event.requiresInvoice
            ? trf("events.detail.finances.tax", "IVA %@%%", String(Int(event.taxRate)))
            : nil

        return EventDetailFinanceSummaryCard(
            title: tr("events.detail.card.finances", "Finanzas"),
            totalLabel: tr("events.detail.finances.total", "Total"),
            totalValue: event.totalAmount.asMXN,
            profitLabel: tr("events.detail.finances.profit", "Utilidad"),
            profitValue: "\(String(format: "%.0f", margin))%",
            discountText: discountText,
            taxText: taxText,
            route: Route.eventFinances(id: eventId)
        )
    }

    // MARK: - Payment Summary Card (navigable)

    private func paymentSummaryCard(_ event: Event) -> some View {
        let depositText: String?
        let isDepositMet: Bool

        if let depositPercent = event.depositPercent, depositPercent > 0 {
            let depositAmount = event.totalAmount * (depositPercent / 100)
            isDepositMet = viewModel.totalPaid >= (depositAmount - 0.1)
            depositText = trf2("events.detail.payments.deposit_card", "Anticipo %@%%: %@", String(Int(depositPercent)), depositAmount.asMXN)
        } else {
            depositText = nil
            isDepositMet = false
        }

        return EventDetailPaymentSummaryCard(
            title: tr("events.detail.card.payments", "Pagos"),
            paymentsCount: viewModel.payments.count,
            paidLabel: tr("events.detail.payments.kpi.paid", "Pagado"),
            paidValue: viewModel.totalPaid.asMXN,
            balanceLabel: tr("events.detail.payments.kpi.balance", "Saldo"),
            balanceValue: viewModel.remaining.asMXN,
            isFullyPaid: viewModel.isFullyPaid,
            progress: viewModel.progress,
            depositText: depositText,
            isDepositMet: isDepositMet,
            route: Route.eventPayments(id: eventId)
        )
    }

    // MARK: - Content Cards Grid

    private func contentCardsGrid(_ event: Event) -> some View {
        EventDetailContentGridSection(
            productsTitle: tr("events.detail.card.products", "Productos"),
            productsCount: viewModel.products.count,
            extrasTitle: tr("events.detail.card.extras", "Extras"),
            extrasCount: viewModel.extras.count,
            suppliesTitle: tr("events.detail.card.supplies", "Insumos"),
            suppliesCount: viewModel.supplies.count,
            equipmentTitle: tr("events.detail.card.equipment", "Equipo"),
            equipmentCount: viewModel.equipment.count,
            shoppingTitle: tr("events.detail.card.shopping", "Compras"),
            shoppingSubtitle: shoppingListSubtitle,
            staffTitle: tr("events.detail.card.staff", "Personal"),
            staffCount: viewModel.eventStaff.count,
            photosTitle: tr("events.detail.card.photos", "Fotos"),
            photosCount: viewModel.eventPhotos.count,
            eventId: eventId
        )
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
        VStack(spacing: Spacing.sm) {
            EventDetailPrimaryLinkCard(
                icon: "checklist",
                title: tr("events.detail.card.checklist", "Checklist de carga"),
                tint: SolennixColors.primary,
                background: SolennixColors.primaryLight,
                route: Route.eventChecklist(id: eventId)
            )

            EventDetailPrimaryLinkCard(
                icon: "cart",
                title: "Checklist de compras",
                tint: SolennixColors.warning,
                background: SolennixColors.warning.opacity(0.15),
                route: Route.eventPurchaseChecklist(id: eventId)
            )
        }
    }

    private var contractPreviewCard: some View {
        EventDetailPrimaryLinkCard(
            icon: "doc.richtext",
            title: tr("events.detail.card.contract", "Ver contrato"),
            tint: SolennixColors.info,
            background: SolennixColors.info.opacity(0.1),
            route: Route.eventContractPreview(id: eventId)
        )
    }

    // MARK: - Client Portal Card (PRD/12 feature A)

    /// Opens a sheet that lets the organizer generate, copy, share, rotate
    /// or revoke the client-portal share link for this event.
    private var clientPortalCard: some View {
        EventDetailPrimaryButtonCard(
            icon: "person.2.circle",
            title: tr("events.detail.share.title", "Portal del cliente"),
            tint: SolennixColors.primary,
            background: SolennixColors.primaryLight,
            action: { showClientPortalSheet = true }
        )
    }

    // MARK: - Action Buttons Row 1 (Payments)

    private func actionButtonsRow1(_ event: Event) -> some View {
        Group {
            if viewModel.remaining > 0.01 {
                EventDetailPaymentActionsCard(
                    recordTitle: tr("events.detail.payments.action.record", "Registrar pago"),
                    settleTitle: trf("events.detail.payments.action.settle", "Liquidar %@", viewModel.remaining.asMXN),
                    depositTitle: (event.depositPercent ?? 0) > 0 && viewModel.depositBalance > 0.01
                        ? trf("events.detail.payments.action.deposit", "Anticipo %@", viewModel.depositBalance.asMXN)
                        : nil,
                    onRecord: { viewModel.showPaymentSheet = true },
                    onSettle: { viewModel.payRemaining() },
                    onDeposit: { viewModel.payDeposit() }
                )
            }
        }
    }

    // MARK: - Live Activity Button

    @ViewBuilder
    private var liveActivityButton: some View {
        if viewModel.canStartLiveActivity || viewModel.isLiveActivityActive {
            EventDetailLiveActivityCard(
                isActive: viewModel.isLiveActivityActive,
                startTitle: tr("events.detail.live_activity.start", "Iniciar actividad en vivo"),
                stopTitle: tr("events.detail.live_activity.stop", "Detener actividad en vivo"),
                action: {
                    if viewModel.isLiveActivityActive {
                        Task { await viewModel.stopLiveActivity() }
                    } else {
                        viewModel.startLiveActivity()
                    }
                }
            )
        }
    }

    // MARK: - Action Buttons Row 3 (Edit)

    private var actionButtonsRow3: some View {
        EventDetailIconTileLinkCard(
            icon: "pencil",
            label: tr("events.detail.action.edit_event", "Editar evento"),
            tint: SolennixColors.info,
            route: Route.eventForm(id: eventId)
        )
    }

    // MARK: - Notes Section

    private func notesSection(_ notes: String) -> some View {
        EventDetailNotesCard(
            title: tr("events.detail.notes", "Notas"),
            notes: notes
        )
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
