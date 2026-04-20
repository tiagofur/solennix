import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Staff Availability View Model

/// Cachea la disponibilidad por fecha para que el picker de personal pueda
/// marcar "Ocupado ese dia" sin hacer una llamada por staff.
/// Usa `@Observable` (iOS 17+) — nada de Combine, nada de @Published.
@Observable
public final class StaffAvailabilityViewModel {

    // MARK: - State

    /// Disponibilidad indexada por `staffId` para lookup O(1) desde la UI.
    /// Un staff ausente de este dict significa "sin asignaciones conocidas"
    /// para la fecha cacheada (no necesariamente libre — depende de si se
    /// llamo `load(for:)` primero).
    public var busyByStaffId: [String: [StaffAvailabilityAssignment]] = [:]

    /// Ultima fecha cargada (YYYY-MM-DD). Permite saltar reloads redundantes.
    public var loadedDate: String?

    public var isLoading: Bool = false
    public var errorMessage: String?

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Loading

    /// Pide disponibilidad para una fecha puntual y popula `busyByStaffId`.
    /// Si la fecha ya esta cacheada, no hace nada.
    @MainActor
    public func load(for date: String) async {
        if loadedDate == date { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let result = try await apiClient.getStaffAvailability(date: date)
            var map: [String: [StaffAvailabilityAssignment]] = [:]
            for entry in result {
                map[entry.staffId] = entry.assignments
            }
            busyByStaffId = map
            loadedDate = date
        } catch {
            errorMessage = (error as? APIError)?.errorDescription
                ?? "No pudimos verificar la disponibilidad."
        }
    }

    /// Invalida el cache. Util cuando la fecha del evento cambia y queremos
    /// forzar un refetch aunque coincida con la anterior.
    public func reset() {
        busyByStaffId = [:]
        loadedDate = nil
    }

    // MARK: - Helpers

    /// `true` si el staff tiene al menos una asignacion activa en la fecha
    /// cacheada. Asignaciones `cancelled` o `declined` no bloquean.
    public func isBusy(staffId: String) -> Bool {
        guard let assignments = busyByStaffId[staffId] else { return false }
        return assignments.contains { a in
            let s = AssignmentStatus(rawValue: a.status) ?? .confirmed
            return s == .pending || s == .confirmed
        }
    }
}
