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
    @State private var duplicateHapticTrigger: Int = 0
    @State private var showBalanceAlert = false
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
                // In-List skeleton so the layout doesn't flash from ProgressView → content
                List {
                    EventDetailHubSkeleton()
                }
                .listStyle(.insetGrouped)
                .solennixListStyle()
            } else if let event = viewModel.event {
                hubList(event)
            } else {
                ContentUnavailableView {
                    Label(tr("events.detail.error.title", "Error"), systemImage: "exclamationmark.triangle")
                } description: {
                    Text(viewModel.errorMessage ?? tr("events.detail.error.load_fallback", "No se pudo cargar el evento"))
                }
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .sensoryFeedback(.success, trigger: viewModel.paymentSavedCounter)
        .sensoryFeedback(.impact(weight: .medium), trigger: duplicateHapticTrigger)
        .navigationTitle(tr("events.detail.title", "Detalle del evento"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                eventMenu
            }
        }
        .confirmationDialog(
            tr("events.detail.status.change_title", "Cambiar estado"),
            isPresented: $viewModel.showStatusSheet
        ) {
            Button(tr("events.detail.status.quoted", "Cotizado")) { Task { await viewModel.changeStatus(.quoted, eventId: eventId) } }
            Button(tr("events.detail.status.confirmed", "Confirmado")) { Task { await viewModel.changeStatus(.confirmed, eventId: eventId) } }
            Button(tr("events.detail.status.completed", "Completado")) {
                if viewModel.remaining > 0.01 {
                    showBalanceAlert = true
                } else {
                    Task { await viewModel.changeStatus(.completed, eventId: eventId) }
                }
            }
            Button(tr("events.detail.status.cancelled", "Cancelado"), role: .destructive) { Task { await viewModel.changeStatus(.cancelled, eventId: eventId) } }
            Button(tr("events.form.cancel", "Cancelar"), role: .cancel) {}
        } message: {
            Text(tr("events.detail.status.change_message", "Selecciona el nuevo estado del evento"))
        }
        .alert(tr("events.detail.status.completed", "Completado"), isPresented: $showBalanceAlert) {
            Button(tr("events.form.ok", "OK")) { }
        } message: {
            Text(String(format: tr("events.detail.error.balance_pending", "El evento tiene un saldo pendiente de $%@ para completar"), locale: FeatureL10n.locale, String(format: "%.2f", viewModel.remaining)))
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
            Text(tr("events.detail.delete.message", "¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer."))
        }
        .sheet(isPresented: $viewModel.showPaymentSheet) {
            paymentSheet
        }
        .task { await viewModel.loadData(eventId: eventId) }
        // B5: if the restored/deep-linked event no longer exists (404), pop
        // silently back to root instead of stranding on the error screen.
        .onChange(of: viewModel.entityNotFound) { _, isGone in
            if isGone { dismiss() }
        }
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
                .presentationDragIndicator(.visible)
        }
    }

    // MARK: - Toolbar Menu

    private var eventMenu: some View {
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

    // MARK: - Hub List

    private func hubList(_ event: Event) -> some View {
        List {
            // MARK: Header section — hero card
            Section {
                EventDetailHeaderCard(
                    event: event,
                    clientName: viewModel.client?.name,
                    clientCity: viewModel.client?.city,
                    clientPhone: viewModel.client?.phone,
                    clientEmail: viewModel.client?.email,
                    month: parseDateComponents(event.eventDate).month,
                    day: parseDateComponents(event.eventDate).day,
                    dateLabel: tr("events.detail.info.date", "Fecha"),
                    dateValue: formatDateShort(event.eventDate),
                    scheduleLabel: tr("events.detail.info.schedule", "Horario"),
                    scheduleValue: scheduleText(event),
                    peopleLabel: tr("events.detail.info.people", "Personas"),
                    peopleValue: trf("events.detail.info.people_value", "%@ PAX", String(event.numPeople)),
                    locationLabel: locationLabel(event),
                    locationValue: locationValue(event),
                    onStatusTap: { viewModel.showStatusSheet = true },
                    editRoute: Route.eventForm(id: eventId, step: 1)
                )
            }
            .listRowSeparator(.hidden)

            // MARK: Notes section
            if let notes = event.notes, !notes.isEmpty {
                Section {
                    EventDetailNotesCard(
                        title: tr("events.detail.notes", "Notas"),
                        notes: notes
                    )
                }
                .listRowSeparator(.hidden)
            }

            // MARK: Finances section
            Section {
                EventDetailFinanceSummaryCard(
                    title: tr("events.detail.card.finances", "Finanzas"),
                    totalLabel: tr("events.detail.finances.total", "Total"),
                    totalValue: event.totalAmount.asMXN,
                    profitLabel: tr("events.detail.finances.profit", "Utilidad"),
                    profitValue: "\(String(format: "%.0f", financialsMargin(event)))%",
                    discountText: discountText(event),
                    taxText: taxText(event),
                    route: Route.eventFinances(id: eventId),
                    editRoute: Route.eventForm(id: eventId, step: 5)
                )
            }
            .listRowSeparator(.hidden)

            // MARK: Payments section
            Section {
                EventDetailPaymentSummaryCard(
                    title: tr("events.detail.card.payments", "Pagos"),
                    paymentsCount: viewModel.payments.count,
                    paidLabel: tr("events.detail.payments.kpi.paid", "Pagado"),
                    paidValue: viewModel.totalPaid.asMXN,
                    balanceLabel: tr("events.detail.payments.kpi.balance", "Saldo"),
                    balanceValue: viewModel.remaining.asMXN,
                    isFullyPaid: viewModel.isFullyPaid,
                    progress: viewModel.progress,
                    depositText: depositText(event),
                    isDepositMet: isDepositMet(event),
                    route: Route.eventPayments(id: eventId),
                    fullyPaidCounter: viewModel.fullyPaidCounter,
                    recordTitle: viewModel.remaining > 0.01 ? tr("events.detail.payments.action.record", "Registrar pago") : nil,
                    settleTitle: viewModel.remaining > 0.01 ? trf("events.detail.payments.action.settle", "Liquidar %@", viewModel.remaining.asMXN) : nil,
                    depositTitle: viewModel.remaining > 0.01 && (event.depositPercent ?? 0) > 0 && viewModel.depositBalance > 0.01
                        ? trf("events.detail.payments.action.deposit", "Anticipo %@", viewModel.depositBalance.asMXN)
                        : nil,
                    onRecord: { viewModel.showRecordPaymentSheet() },
                    onSettle: { viewModel.payRemaining() },
                    onDeposit: { viewModel.payDeposit() }
                )
            }
            .listRowSeparator(.hidden)

            // MARK: Content navigation section (products, extras, supplies, equipment, staff, photos)
            Section(header: Text(tr("events.detail.section.content", "Contenido")).font(.caption).foregroundStyle(SolennixColors.textSecondary)) {
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

            // MARK: Tools section (checklist, contract, portal)
            Section(header: Text(tr("events.detail.section.tools", "Herramientas")).font(.caption).foregroundStyle(SolennixColors.textSecondary)) {
                EventDetailPrimaryLinkCard(
                    icon: "checklist",
                    title: tr("events.detail.card.checklist", "Checklist de carga"),
                    tint: SolennixColors.primary,
                    background: SolennixColors.primaryLight,
                    route: Route.eventChecklist(id: eventId)
                )

                EventDetailPrimaryLinkCard(
                    icon: "cart",
                    title: tr("events.detail.card.shopping_checklist", "Checklist de compras"),
                    tint: SolennixColors.warning,
                    background: SolennixColors.warningBg,
                    route: Route.eventPurchaseChecklist(id: eventId)
                )

                EventDetailPrimaryLinkCard(
                    icon: "doc.richtext",
                    title: tr("events.detail.card.contract", "Ver contrato"),
                    tint: SolennixColors.info,
                    background: SolennixColors.info.opacity(0.1),
                    route: Route.eventContractPreview(id: eventId)
                )

                EventDetailPrimaryButtonCard(
                    icon: "person.2.circle",
                    title: tr("events.detail.share.title", "Portal del cliente"),
                    tint: SolennixColors.primary,
                    background: SolennixColors.primaryLight,
                    action: { showClientPortalSheet = true }
                )
            }

            // MARK: Documents section
            Section {
                EventDetailDocumentsCard(
                    title: tr("events.detail.documents.title", "Generar documentos"),
                    options: pdfOptions,
                    onTap: { key in
                        Task { await generateAndSharePDF(key: key, event: event) }
                    }
                )
            }
            .solennixRow()
            .listRowSeparator(.hidden)

            // MARK: Photos preview (only when photos exist)
            if !viewModel.eventPhotos.isEmpty {
                Section {
                    EventDetailPhotosPreviewCard(
                        title: tr("events.detail.card.photos", "Fotos"),
                        photos: viewModel.eventPhotos,
                        route: Route.eventPhotos(id: eventId)
                    )
                }
                .solennixRow()
                .listRowSeparator(.hidden)
            }

            // MARK: Live activity
            if viewModel.canStartLiveActivity || viewModel.isLiveActivityActive {
                Section {
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
        }
        .listStyle(.insetGrouped)
        .solennixListStyle()
        .softScrollEdgeEffectIfAvailable()
        .refreshable {
            // Does NOT clear arrays — avoids skeleton flash on pull-to-refresh.
            await viewModel.loadData(eventId: eventId)
        }
    }

    // MARK: - Computed helpers (extracted from long `hubList` body)

    private func scheduleText(_ event: Event) -> String? {
        event.startTime.map { [$0, event.endTime].compactMap { $0 }.joined(separator: " - ") }
    }

    private func locationLabel(_ event: Event) -> String? {
        if let location = event.location, !location.isEmpty { return tr("events.detail.info.location", "Ubicación") }
        if let city = event.city, !city.isEmpty { return tr("events.detail.info.city", "Ciudad") }
        return nil
    }

    private func locationValue(_ event: Event) -> String? {
        if let location = event.location, !location.isEmpty {
            return [location, event.city].compactMap { v in
                guard let v, !v.isEmpty else { return nil }
                return v
            }.joined(separator: ", ")
        }
        if let city = event.city, !city.isEmpty { return city }
        return nil
    }

    private func financialsMargin(_ event: Event) -> Double {
        let productRows = viewModel.products.map { p in
            EventFinancials.ProductRow(quantity: p.quantity, unitPrice: p.unitPrice, lineDiscount: p.discount, unitCost: viewModel.productUnitCosts[p.productId])
        }
        let extraRows = viewModel.extras.map { e in
            EventFinancials.ExtraRow(price: e.price, cost: e.cost, excludeUtility: e.excludeUtility)
        }
        let supplyRows = viewModel.supplies.map { s in
            EventFinancials.SupplyRow(quantity: s.quantity, unitCost: s.unitCost, excludeCost: s.excludeCost)
        }
        return EventFinancials.compute(
            products: productRows, extras: extraRows, supplies: supplyRows,
            globalDiscountType: event.discountType, globalDiscount: event.discount,
            requiresInvoice: event.requiresInvoice, taxRate: event.taxRate
        ).profitMargin
    }

    private func discountText(_ event: Event) -> String? {
        guard event.discount > 0 else { return nil }
        return event.discountType == .percent
            ? trf("events.detail.finances.discount_percent", "Descuento %@%%", String(Int(event.discount)))
            : tr("events.detail.finances.discount", "Descuento")
    }

    private func taxText(_ event: Event) -> String? {
        event.requiresInvoice
            ? trf("events.detail.finances.tax", "IVA %@%%", String(Int(event.taxRate)))
            : nil
    }

    private func depositText(_ event: Event) -> String? {
        guard let pct = event.depositPercent, pct > 0 else { return nil }
        let amount = event.totalAmount * (pct / 100)
        return trf2("events.detail.payments.deposit_card", "Anticipo %@%%: %@", String(Int(pct)), amount.asMXN)
    }

    private func isDepositMet(_ event: Event) -> Bool {
        guard let pct = event.depositPercent, pct > 0 else { return false }
        return viewModel.totalPaid >= (event.totalAmount * pct / 100 - 0.1)
    }

    private var shoppingListSubtitle: String? {
        let purchaseCount = viewModel.supplies.filter { $0.source == .purchase }.count
        guard purchaseCount > 0 else { return nil }
        return trf("events.detail.shopping.pending_count", "%@ por comprar", String(purchaseCount))
    }

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

    // MARK: - Helpers

    private func formatDateShort(_ dateString: String) -> String {
        guard let date = Date.fromServerDay(dateString) else { return dateString }
        return date.formattedServerDay(style: "d MMM yyyy")
    }

    private func parseDateComponents(_ dateString: String) -> (month: String, day: String) {
        guard let date = Date.fromServerDay(dateString) else { return ("---", "--") }
        return (date.formattedServerDay(style: "MMM"), date.formattedServerDay(style: "d"))
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
        duplicateHapticTrigger &+= 1
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
