import SwiftUI
import PhotosUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Detail View

public struct EventDetailView: View {

    let eventId: String

    @State private var viewModel: EventDetailViewModel
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @Environment(\.dismiss) private var dismiss

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
        .navigationTitle("Detalle del Evento")
        .navigationBarTitleDisplayMode(.inline)
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

    // MARK: - Scroll Content

    private func scrollContent(_ event: Event) -> some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                headerCard(event)
                detailsSection(event)

                if !viewModel.products.isEmpty {
                    productsSection
                }

                if !viewModel.extras.isEmpty {
                    extrasSection
                }

                if !viewModel.supplies.isEmpty {
                    suppliesSection
                }

                if !viewModel.equipment.isEmpty {
                    equipmentSection
                }

                financesCard(event)
                paymentsCard(event)

                if let notes = event.notes, !notes.isEmpty {
                    notesSection(notes)
                }

                photosSection

                actionButtonsRow1(event)
                liveActivityButton
                actionButtonsRow2
                actionButtonsRow3
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
        .refreshable { await viewModel.loadData(eventId: eventId) }
    }

    // MARK: - Header Card

    private func headerCard(_ event: Event) -> some View {
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
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
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

    // MARK: - Details Section

    private func detailsSection(_ event: Event) -> some View {
        VStack(spacing: Spacing.sm) {
            detailRow(icon: "calendar", text: formatDate(event.eventDate))

            if let startTime = event.startTime {
                let timeText = [startTime, event.endTime].compactMap { $0 }.joined(separator: " - ")
                detailRow(icon: "clock", text: timeText)
            }

            detailRow(icon: "person.2", text: "\(event.numPeople) personas")

            if let location = event.location, !location.isEmpty {
                let fullLocation = [location, event.city].compactMap { $0 }.joined(separator: ", ")
                detailRow(icon: "mappin", text: fullLocation)
            } else if let city = event.city, !city.isEmpty {
                detailRow(icon: "mappin", text: city)
            }
        }
    }

    private func detailRow(icon: String, text: String) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(SolennixColors.primary)
                .frame(width: 24)

            Text(text)
                .font(.body)
                .foregroundStyle(SolennixColors.text)

            Spacer()
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
    }

    // MARK: - Products Section

    private var productsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            sectionHeader("Productos")

            ForEach(viewModel.products) { product in
                HStack {
                    Text(viewModel.productName(for: product.productId))
                        .font(.body)
                        .foregroundStyle(SolennixColors.text)

                    Spacer()

                    Text("\(product.quantity) x \(product.unitPrice.asMXN)")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Text((Double(product.quantity) * product.unitPrice).asMXN)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)
                        .frame(width: 80, alignment: .trailing)
                }
                .padding(Spacing.md)
                .background(SolennixColors.card)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
        }
    }

    // MARK: - Extras Section

    private var extrasSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            sectionHeader("Extras")

            ForEach(viewModel.extras) { extra in
                HStack {
                    Text(extra.description)
                        .font(.body)
                        .foregroundStyle(SolennixColors.text)

                    Spacer()

                    Text(extra.price.asMXN)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)
                }
                .padding(Spacing.md)
                .background(SolennixColors.card)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
        }
    }

    // MARK: - Supplies Section

    private var suppliesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            sectionHeader("Insumos")

            ForEach(viewModel.supplies) { supply in
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(supply.supplyName ?? "Insumo")
                            .font(.body)
                            .foregroundStyle(SolennixColors.text)

                        sourceBadge(supply.source)
                    }

                    Spacer()

                    Text("\(formatQuantity(supply.quantity)) x \(supply.unitCost.asMXN)")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Text((supply.quantity * supply.unitCost).asMXN)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)
                        .frame(width: 80, alignment: .trailing)
                }
                .padding(Spacing.md)
                .background(SolennixColors.card)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
        }
    }

    private func sourceBadge(_ source: SupplySource) -> some View {
        let label = source == .stock ? "Almacen" : "Compra"
        let color = source == .stock ? SolennixColors.success : SolennixColors.warning
        return Text(label)
            .font(.caption2)
            .fontWeight(.medium)
            .foregroundStyle(color)
            .padding(.horizontal, Spacing.xs)
            .padding(.vertical, 2)
            .background(color.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
    }

    // MARK: - Equipment Section

    private var equipmentSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            sectionHeader("Equipo")

            ForEach(viewModel.equipment) { item in
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(item.equipmentName ?? "Equipo")
                            .font(.body)
                            .foregroundStyle(SolennixColors.text)

                        if let notes = item.notes, !notes.isEmpty {
                            Text(notes)
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }
                    }

                    Spacer()

                    Text("x\(item.quantity)")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
                .padding(Spacing.md)
                .background(SolennixColors.card)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
        }
    }

    // MARK: - Finances Card

    private func financesCard(_ event: Event) -> some View {
        VStack(spacing: Spacing.sm) {
            sectionHeader("Finanzas")

            let subtotal = event.totalAmount - event.taxAmount + (event.discountType == .fixed ? event.discount : 0)

            financeRow(label: "Subtotal", value: subtotal.asMXN)

            if event.discount > 0 {
                let discountLabel = event.discountType == .percent
                    ? "Descuento (\(Int(event.discount))%)"
                    : "Descuento"
                let discountAmount = event.discountType == .percent
                    ? subtotal * event.discount / 100
                    : event.discount
                financeRow(label: discountLabel, value: "-\(discountAmount.asMXN)", color: SolennixColors.error)
            }

            if event.taxAmount > 0 {
                financeRow(label: "IVA (\(Int(event.taxRate))%)", value: event.taxAmount.asMXN)
            }

            Divider()
                .background(SolennixColors.border)

            HStack {
                Text("TOTAL")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.primary)

                Spacer()

                Text(event.totalAmount.asMXN)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.primary)
            }
        }
        .padding(Spacing.lg)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }

    private func financeRow(label: String, value: String, color: Color = SolennixColors.text) -> some View {
        HStack {
            Text(label)
                .font(.body)
                .foregroundStyle(SolennixColors.textSecondary)

            Spacer()

            Text(value)
                .font(.body)
                .foregroundStyle(color)
        }
    }

    // MARK: - Payments Card

    private func paymentsCard(_ event: Event) -> some View {
        VStack(spacing: Spacing.md) {
            sectionHeader("Pagos")

            // Mini KPIs
            HStack(spacing: Spacing.sm) {
                miniKpi(
                    label: "Total",
                    value: event.totalAmount.asMXN,
                    color: SolennixColors.primary,
                    bgColor: SolennixColors.primaryLight
                )
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
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(SolennixColors.primary)
                        .frame(width: geo.size.width * viewModel.progress / 100, height: 8)
                }
            }
            .frame(height: 8)

            // Payment list
            if viewModel.payments.isEmpty {
                Text("No hay pagos registrados")
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.sm)
            } else {
                ForEach(viewModel.payments) { payment in
                    paymentRow(payment)
                }
            }
        }
        .padding(Spacing.lg)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }

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

    private func paymentRow(_ payment: Payment) -> some View {
        HStack(spacing: Spacing.sm) {
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(formatDate(payment.paymentDate))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)

                Text(paymentMethodLabel(payment.paymentMethod))
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)

                if let notes = payment.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }

            Spacer()

            Text(payment.amount.asMXN)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.success)

            Button {
                viewModel.deletePaymentId = payment.id
                Task {
                    await viewModel.deletePayment(id: payment.id, eventId: eventId)
                }
            } label: {
                Image(systemName: "trash")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.error)
                    .padding(Spacing.xs)
            }
        }
        .padding(Spacing.sm)
        .background(SolennixColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    // MARK: - Notes Section

    private func notesSection(_ notes: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            sectionHeader("Notas")

            Text(notes)
                .font(.body)
                .foregroundStyle(SolennixColors.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Spacing.md)
                .background(SolennixColors.card)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        }
    }

    // MARK: - Photos Section

    private var photosSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            sectionHeader("Fotos")

            let columns = [GridItem(.adaptive(minimum: 100, maximum: 150), spacing: Spacing.sm)]

            LazyVGrid(columns: columns, spacing: Spacing.sm) {
                ForEach(Array(viewModel.eventPhotos.enumerated()), id: \.offset) { index, url in
                    AsyncImage(url: URL(string: url)) { image in
                        image
                            .resizable()
                            .scaledToFill()
                    } placeholder: {
                        ProgressView()
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(SolennixColors.surfaceAlt)
                    }
                    .frame(height: 100)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .overlay(alignment: .topTrailing) {
                        Button {
                            Task { await viewModel.removePhoto(at: index, eventId: eventId) }
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.body)
                                .foregroundStyle(.white)
                                .shadow(radius: 2)
                                .padding(Spacing.xs)
                        }
                    }
                }

                // Add button
                PhotosPicker(
                    selection: $selectedPhotos,
                    maxSelectionCount: 5,
                    matching: .images
                ) {
                    VStack(spacing: Spacing.xs) {
                        Image(systemName: "plus")
                            .font(.title3)
                            .foregroundStyle(SolennixColors.primary)

                        if viewModel.isUploadingPhoto {
                            ProgressView()
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 100)
                    .background(SolennixColors.primaryLight)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .strokeBorder(SolennixColors.primary.opacity(0.3), style: StrokeStyle(lineWidth: 1, dash: [6]))
                    )
                }
                .onChange(of: selectedPhotos) { _, newItems in
                    Task {
                        var imageDataArray: [Data] = []
                        for item in newItems {
                            if let data = try? await item.loadTransferable(type: Data.self) {
                                imageDataArray.append(data)
                            }
                        }
                        if !imageDataArray.isEmpty {
                            await viewModel.addPhotos(data: imageDataArray, eventId: eventId)
                        }
                        selectedPhotos = []
                    }
                }
            }
        }
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

    // MARK: - Action Buttons Row 2 (Checklist)

    private var actionButtonsRow2: some View {
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

    // MARK: - Action Buttons Row 3 (PDF, Edit, Delete)

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

            Button {
                viewModel.showDeleteConfirm = true
            } label: {
                actionButton(icon: "trash", label: "Eliminar", fg: SolennixColors.error)
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

    // MARK: - Payment Sheet

    private var paymentSheet: some View {
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                Text("Registrar Pago")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)

                // Amount
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

                // Payment method
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

                // Notes
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
                        // PDF generation handled externally
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

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.headline)
            .foregroundStyle(SolennixColors.text)
            .padding(.horizontal, Spacing.xs)
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "es_MX")

        guard let date = formatter.date(from: String(dateString.prefix(10))) else {
            return dateString
        }

        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "EEEE d 'de' MMMM, yyyy"
        displayFormatter.locale = Locale(identifier: "es_MX")
        return displayFormatter.string(from: date).capitalized
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

    private func formatQuantity(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", value)
            : String(format: "%.2f", value)
    }

    private func paymentMethodLabel(_ method: String) -> String {
        switch method.lowercased() {
        case "efectivo": return "Efectivo"
        case "transferencia": return "Transferencia"
        case "tarjeta": return "Tarjeta"
        case "cheque": return "Cheque"
        default: return method.capitalized
        }
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
