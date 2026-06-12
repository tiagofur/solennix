import ActivityKit
import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Event Detail View Model

@Observable
public final class EventDetailViewModel {

    // MARK: - Properties

    public var event: Event?
    public var client: Client?
    public var products: [EventProduct] = []
    public var extras: [EventExtra] = []
    public var equipment: [EventEquipment] = []
    public var supplies: [EventSupply] = []
    public var payments: [Payment] = []
    public var eventPhotos: [String] = []
    public var eventStaff: [EventStaff] = []

    public var isLoading: Bool = false
    public var showDeleteConfirm: Bool = false
    public var showStatusSheet: Bool = false
    public var showPaymentSheet: Bool = false

    public var paymentAmount: String = ""
    public var paymentMethod: String = "cash"
    public var paymentNotes: String = ""
    public var isSavingPayment: Bool = false
    public var isUploadingPhoto: Bool = false

    public var errorMessage: String?
    public var isLiveActivityActive: Bool = false

    /// Map of product ID -> Product for resolving product names.
    public var productMap: [String: Product] = [:]

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    private func tr(_ key: String, _ defaultValue: String) -> String {
        FeatureL10n.text(key, defaultValue)
    }

    // MARK: - Computed

    public var totalPaid: Double {
        payments.reduce(0) { $0 + $1.amount }
    }

    public var remaining: Double {
        guard let event else { return 0 }
        return max(event.totalAmount - totalPaid, 0)
    }

    public var progress: Double {
        guard let event, event.totalAmount > 0 else { return 0 }
        return min((totalPaid / event.totalAmount) * 100, 100)
    }

    public var isFullyPaid: Bool {
        remaining <= 0.01
    }

    /// Bumped by 1 each time a payment is registered AND the event becomes fully paid
    /// as a result. Used by PaymentCollectionRing's `.sensoryFeedback(.success, trigger:)`.
    public var fullyPaidCounter: Int = 0

    /// Bumped by 1 each time a payment is saved but does NOT tip the event to fully paid.
    /// EventDetailView observes this for its `.sensoryFeedback(.success, trigger:)` so
    /// that exactly one success haptic fires per payment — never a double haptic on the
    /// fully-paid crossing (where fullyPaidCounter fires instead).
    public var paymentSavedCounter: Int = 0

    /// Monto total del anticipo basado en `depositPercent` y `totalAmount`.
    /// Devuelve 0 si el evento no tiene porcentaje de anticipo.
    public var depositAmount: Double {
        guard let event, let pct = event.depositPercent, pct > 0 else { return 0 }
        return event.totalAmount * pct / 100.0
    }

    /// Saldo pendiente del anticipo (lo que falta pagar para cubrirlo).
    public var depositBalance: Double {
        max(depositAmount - totalPaid, 0)
    }

    /// Indica si el evento es elegible para iniciar una Live Activity.
    /// Solo disponible para eventos confirmados del día de hoy.
    ///
    /// "Today" is evaluated in the device's local timezone: an event dated
    /// 2026-06-15 is live-eligible when the user's device clock reads June 15.
    /// `Date.isServerDayToday` compares the raw server string against the local
    /// date string — no Date round-trip, no UTC/local ambiguity.
    public var canStartLiveActivity: Bool {
        guard let event else { return false }
        guard event.status == .confirmed else { return false }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }

        return Date.isServerDayToday(event.eventDate)
    }

    // MARK: - Data Loading

    @MainActor
    public func loadData(eventId: String) async {
        isLoading = true
        errorMessage = nil

        do {
            // Fetch event first (needed for clientId)
            let fetchedEvent: Event = try await apiClient.get(Endpoint.event(eventId))
            event = fetchedEvent

            // Parse photos from event.photos JSON string
            if let photosString = fetchedEvent.photos,
               let data = photosString.data(using: .utf8),
               let urls = try? JSONDecoder().decode([String].self, from: data) {
                eventPhotos = urls
            } else {
                eventPhotos = []
            }

            // Fetch related data in parallel using TaskGroup to avoid async let dealloc crash
            await withTaskGroup(of: Void.self) { group in
                group.addTask { [apiClient] in
                    if let result: [EventProduct] = try? await apiClient.get(Endpoint.eventProducts(eventId)) {
                        await MainActor.run { self.products = result }
                    }
                }
                group.addTask { [apiClient] in
                    if let result: [EventExtra] = try? await apiClient.get(Endpoint.eventExtras(eventId)) {
                        await MainActor.run { self.extras = result }
                    }
                }
                group.addTask { [apiClient] in
                    if let result: [EventEquipment] = try? await apiClient.get(Endpoint.eventEquipment(eventId)) {
                        await MainActor.run { self.equipment = result }
                    }
                }
                group.addTask { [apiClient] in
                    if let result: [EventSupply] = try? await apiClient.get(Endpoint.eventSupplies(eventId)) {
                        await MainActor.run { self.supplies = result }
                    }
                }
                group.addTask { [apiClient] in
                    if let result: [Payment] = try? await apiClient.getAll(Endpoint.payments, params: ["event_id": eventId]) {
                        await MainActor.run { self.payments = result }
                    }
                }
                group.addTask { [apiClient] in
                    if let allProducts: [Product] = try? await apiClient.getAll(Endpoint.products) {
                        await MainActor.run { self.productMap = Dictionary(uniqueKeysWithValues: allProducts.map { ($0.id, $0) }) }
                    }
                }
                group.addTask { [apiClient] in
                    if let fetchedClient: Client = try? await apiClient.get(Endpoint.client(fetchedEvent.clientId)) {
                        await MainActor.run { self.client = fetchedClient }
                    }
                }
                group.addTask { [apiClient] in
                    if let result: [EventStaff] = try? await apiClient.get(Endpoint.eventStaff(eventId)) {
                        await MainActor.run { self.eventStaff = result }
                    }
                }
            }
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? tr("events.detail.error.load", "Error cargando el evento")
            } else {
                errorMessage = tr("events.detail.error.load", "Error cargando el evento")
            }
        }

        isLoading = false
        checkLiveActivityState()

        // Si la Live Activity está activa, reconciliar su estado con el del backend.
        // Esto cubre pull-to-refresh, deep links y retorno desde background.
        if isLiveActivityActive {
            await updateLiveActivityStatus()
        }
    }

    // MARK: - Scoped Load Methods

    /// Fetches only the equipment list for an event.
    /// Use this from EventEquipmentDetailView to avoid firing 8 parallel requests.
    @MainActor
    public func loadEquipmentOnly(eventId: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let result: [EventEquipment] = try await apiClient.get(Endpoint.eventEquipment(eventId))
            equipment = result
        } catch {
            // Equipment list is non-critical — silently absorb; view shows empty state.
        }
    }

    /// Fetches only the extras list for an event.
    /// Use this from EventExtrasDetailView to avoid firing 8 parallel requests.
    @MainActor
    public func loadExtrasOnly(eventId: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let result: [EventExtra] = try await apiClient.get(Endpoint.eventExtras(eventId))
            extras = result
        } catch {
            // Extras list is non-critical — silently absorb; view shows empty state.
        }
    }

    /// Fetches only the supplies list for an event.
    /// Use this from EventSuppliesDetailView to avoid firing 8 parallel requests.
    @MainActor
    public func loadSuppliesOnly(eventId: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let result: [EventSupply] = try await apiClient.get(Endpoint.eventSupplies(eventId))
            supplies = result
        } catch {
            // Supplies list is non-critical — silently absorb; view shows empty state.
        }
    }

    /// Fetches only the products list and the product catalog (for name resolution).
    /// Use this from EventProductsDetailView to avoid firing 8 parallel requests.
    @MainActor
    public func loadProductsOnly(eventId: String) async {
        isLoading = true
        defer { isLoading = false }
        await withTaskGroup(of: Void.self) { group in
            group.addTask { [apiClient] in
                if let result: [EventProduct] = try? await apiClient.get(Endpoint.eventProducts(eventId)) {
                    await MainActor.run { self.products = result }
                }
            }
            group.addTask { [apiClient] in
                if let allProducts: [Product] = try? await apiClient.getAll(Endpoint.products) {
                    await MainActor.run {
                        self.productMap = Dictionary(uniqueKeysWithValues: allProducts.map { ($0.id, $0) })
                    }
                }
            }
        }
    }

    // MARK: - Status

    @MainActor
    public func changeStatus(_ newStatus: EventStatus, eventId: String) async {
        do {
            let body: [String: String] = ["status": newStatus.rawValue]
            let updated: Event = try await apiClient.put(Endpoint.event(eventId), body: body)
            event = updated
            HapticsHelper.play(.success)
            
            NotificationCenter.default.post(name: .solennixEventUpdated, object: nil)

            // Actualizar la Live Activity si está activa
            await updateLiveActivityStatus()
        } catch {
            HapticsHelper.play(.error)
            errorMessage = tr("events.detail.error.change_status", "Error al cambiar el estado")
        }
    }

    // MARK: - Payments

    @MainActor
    public func addPayment(eventId: String) async {
        guard let amount = Double(paymentAmount.replacingOccurrences(of: ",", with: ".")), amount > 0 else { return }
        isSavingPayment = true

        do {
            // Use the established Date.localTodayString() helper — it formats the
            // current date in the DEVICE's local timezone, matching the user's
            // calendar day (an event paid at 11pm in UTC-6 must record that local day).
            let today = Date.localTodayString()

            let body: [String: Any] = [
                "event_id": eventId,
                "amount": amount,
                "payment_date": today,
                "payment_method": paymentMethod,
                "notes": paymentNotes
            ]

            let payment: Payment = try await apiClient.post(Endpoint.payments, body: AnyCodable(body))

            payments.append(payment)

            // Route to the correct counter so exactly one haptic fires:
            // - fully-paid crossing → fullyPaidCounter (ring's .sensoryFeedback fires)
            // - any other payment   → paymentSavedCounter (EventDetailView's .sensoryFeedback fires)
            if isFullyPaid {
                fullyPaidCounter &+= 1
            } else {
                paymentSavedCounter &+= 1
            }

            // Notificar a la app target para que programe el recibo en Notification Center.
            NotificationCenter.default.post(
                name: .solennixPaymentRegistered,
                    object: nil,
                    userInfo: [
                        "payment_id": payment.id,
                        "event_id": eventId,
                        "client_name": client?.name ?? tr("events.detail.client_fallback", "Cliente"),
                        "amount": payment.amount
                    ]
                )

            // Reload event from backend — the server auto-confirms quoted -> confirmed
            // when accumulated payments cover the required deposit (autoConfirmQuotedEventIfDepositCovered).
            await loadData(eventId: eventId)

            // Reset form
            paymentAmount = ""
            paymentMethod = "cash"
            paymentNotes = ""
            showPaymentSheet = false
        } catch {
            HapticsHelper.play(.error)
            errorMessage = tr("events.detail.error.add_payment", "Error al registrar el pago")
        }

        isSavingPayment = false
    }

    /// Opens the payment sheet with all fields reset to defaults.
    /// Call this for the generic "Registrar pago" action (no pre-fill needed).
    @MainActor
    public func showRecordPaymentSheet() {
        paymentAmount = ""
        paymentMethod = "cash"
        paymentNotes = ""
        showPaymentSheet = true
    }

    @MainActor
    public func payRemaining() {
        // Reset sheet fields before presenting so each presentation starts clean.
        paymentMethod = "cash"
        paymentNotes = ""
        paymentAmount = String(format: "%.2f", remaining)
        showPaymentSheet = true
    }

    @MainActor
    public func payDeposit() {
        let balance = depositBalance
        guard balance > 0.01 else { return }
        // Reset sheet fields before presenting; notes is intentionally pre-filled.
        paymentMethod = "cash"
        paymentAmount = String(format: "%.2f", balance)
        paymentNotes = tr("events.detail.deposit", "Anticipo")
        showPaymentSheet = true
    }

    @MainActor
    public func deletePayment(id: String, eventId: String) async {
        do {
            try await apiClient.delete(Endpoint.payment(id))
            payments.removeAll { $0.id == id }
            HapticsHelper.play(.success)
            
            NotificationCenter.default.post(name: .solennixPaymentDeleted, object: nil)

            // Reload to sync status
            await loadData(eventId: eventId)
        } catch {
            HapticsHelper.play(.error)
            errorMessage = tr("events.detail.error.delete_payment", "Error al eliminar el pago")
        }
    }

    // MARK: - Delete Event

    @MainActor
    public func deleteEvent(eventId: String) async -> Bool {
        do {
            try await apiClient.delete(Endpoint.event(eventId))
            HapticsHelper.play(.success)
            NotificationCenter.default.post(name: .solennixEventUpdated, object: nil)
            return true
        } catch {
            HapticsHelper.play(.error)
            errorMessage = tr("events.detail.error.delete_event", "Error al eliminar el evento")
            return false
        }
    }

    // MARK: - Photos

    @MainActor
    public func addPhotos(data: [Data], eventId: String) async {
        isUploadingPhoto = true

        do {
            for (index, imageData) in data.enumerated() {
                let filename = "event_\(eventId)_\(Date().timeIntervalSince1970)_\(index).jpg"
                let response = try await apiClient.upload(Endpoint.uploadImage, data: imageData, filename: filename)
                eventPhotos.append(response.url)
            }

            // Update event photos
            let photosJson = try JSONEncoder().encode(eventPhotos)
            let photosString = String(data: photosJson, encoding: .utf8) ?? "[]"
            let body: [String: String] = ["photos": photosString]
            let _: Event = try await apiClient.put(Endpoint.event(eventId), body: body)
        } catch {
            errorMessage = tr("events.detail.error.upload_photos", "Error al subir las fotos")
        }

        isUploadingPhoto = false
    }

    @MainActor
    public func removePhoto(at index: Int, eventId: String) async {
        guard index >= 0 && index < eventPhotos.count else { return }
        // Snapshot before mutating so we can restore on PUT failure — otherwise
        // the UI and backend diverge permanently (photo hidden locally, still
        // on the server). Mirrors the `softDeleteClient` undo pattern.
        let snapshot = eventPhotos
        let removed = eventPhotos.remove(at: index)

        do {
            let photosJson = try JSONEncoder().encode(eventPhotos)
            let photosString = String(data: photosJson, encoding: .utf8) ?? "[]"
            let body: [String: String] = ["photos": photosString]
            let _: Event = try await apiClient.put(Endpoint.event(eventId), body: body)
        } catch {
            eventPhotos = snapshot
            _ = removed
            errorMessage = tr("events.detail.error.delete_photo", "Error al eliminar la foto")
        }
    }

    // MARK: - Live Activity

    /// Inicia una Live Activity para el evento actual.
    @MainActor
    public func startLiveActivity() {
        guard let event, let client else { return }
        let started = LiveActivityManager.shared.startEventActivity(event: event, client: client)
        isLiveActivityActive = started
    }

    /// Finaliza la Live Activity del evento actual.
    @MainActor
    public func stopLiveActivity() async {
        guard let event else { return }
        await LiveActivityManager.shared.endEventActivity(eventId: event.id)
        isLiveActivityActive = false
    }

    /// Actualiza el estado de la Live Activity del evento actual según su nuevo estado.
    @MainActor
    public func updateLiveActivityStatus() async {
        guard let event, isLiveActivityActive else { return }

        let liveStatus: String
        switch event.status {
        case .confirmed: liveStatus = "setup"
        case .completed: liveStatus = "completed"
        default:         liveStatus = "in_progress"
        }

        await LiveActivityManager.shared.updateEventActivity(eventId: event.id, status: liveStatus)

        // Si el evento se completó o canceló, finalizar la actividad
        if event.status == .completed || event.status == .cancelled {
            await stopLiveActivity()
        }
    }

    /// Verifica si hay una Live Activity activa para este evento al cargar los datos.
    @MainActor
    public func checkLiveActivityState() {
        guard let event else { return }
        isLiveActivityActive = LiveActivityManager.shared.hasActiveActivity(for: event.id)
    }

    // MARK: - Helpers

    public func productName(for productId: String) -> String {
        productMap[productId]?.name ?? tr("events.detail.product_fallback", "Producto")
    }
}
