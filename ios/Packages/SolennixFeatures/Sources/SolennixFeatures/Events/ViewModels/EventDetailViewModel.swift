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
    public var deletePaymentId: String?

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

    /// Reusable `yyyy-MM-dd` formatter. SwiftUI re-reads `canStartLiveActivity`
    /// on every render, so allocating a new `DateFormatter` per access (as we
    /// did previously) showed up as measurable render overhead on devices.
    private static let isoDayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    /// Indica si el evento es elegible para iniciar una Live Activity.
    /// Solo disponible para eventos confirmados del día de hoy.
    public var canStartLiveActivity: Bool {
        guard let event else { return false }
        guard event.status == .confirmed else { return false }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }

        let today = Self.isoDayFormatter.string(from: Date())
        let eventDateStr = String(event.eventDate.prefix(10))

        return eventDateStr == today
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
                errorMessage = apiError.errorDescription ?? "Error cargando el evento"
            } else {
                errorMessage = "Error cargando el evento"
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
            errorMessage = "Error al cambiar el estado"
        }
    }

    // MARK: - Payments

    @MainActor
    public func addPayment(eventId: String) async {
        guard let amount = Double(paymentAmount.replacingOccurrences(of: ",", with: ".")), amount > 0 else { return }
        isSavingPayment = true

        do {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let today = dateFormatter.string(from: Date())

            let body: [String: Any] = [
                "event_id": eventId,
                "amount": amount,
                "payment_date": today,
                "payment_method": paymentMethod,
                "notes": paymentNotes
            ]

            let payment: Payment = try await apiClient.post(Endpoint.payments, body: AnyCodable(body))

            payments.append(payment)
            HapticsHelper.play(.success)

            // Notificar a la app target para que programe el recibo en Notification Center.
            NotificationCenter.default.post(
                name: .solennixPaymentRegistered,
                object: nil,
                userInfo: [
                    "payment_id": payment.id,
                    "event_id": eventId,
                    "client_name": client?.name ?? "Cliente",
                    "amount": payment.amount
                ]
            )

            // Auto-confirm if quoted and payment received
            if event?.status == .quoted {
                await changeStatus(.confirmed, eventId: eventId)
            }

            // Reset form
            paymentAmount = ""
            paymentMethod = "cash"
            paymentNotes = ""
            showPaymentSheet = false
        } catch {
            HapticsHelper.play(.error)
            errorMessage = "Error al registrar el pago"
        }

        isSavingPayment = false
    }

    public func payRemaining() {
        let formatted = String(format: "%.2f", remaining)
        paymentAmount = formatted
        showPaymentSheet = true
    }

    public func payDeposit() {
        guard let event else { return }
        let depositPct = event.depositPercent ?? 0.0
        if depositPct > 0 {
            let depositAmount = (event.totalAmount * depositPct) / 100.0
            let formatted = String(format: "%.2f", depositAmount)
            paymentAmount = formatted
            showPaymentSheet = true
        }
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
            errorMessage = "Error al eliminar el pago"
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
            errorMessage = "Error al eliminar el evento"
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
            errorMessage = "Error al subir las fotos"
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
            errorMessage = "Error al eliminar la foto"
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
        productMap[productId]?.name ?? "Producto"
    }
}
