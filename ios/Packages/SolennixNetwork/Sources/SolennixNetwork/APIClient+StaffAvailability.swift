import Foundation
import SolennixCore

// MARK: - Staff Availability

/// Typed helpers para el endpoint `GET /api/staff/availability`.
/// Solo expone wrappers sobre `APIClient.get` — toda la complejidad (auth,
/// retries, decoding) vive en el cliente base.
public extension APIClient {

    /// Disponibilidad del personal para una sola fecha (YYYY-MM-DD).
    /// Devuelve solo staff CON asignaciones en esa fecha; array vacio = libres.
    func getStaffAvailability(date: String) async throws -> [StaffAvailability] {
        try await get(Endpoint.staffAvailability, params: ["date": date])
    }

    /// Disponibilidad del personal para un rango inclusivo (YYYY-MM-DD).
    /// Devuelve solo staff CON asignaciones dentro del rango.
    func getStaffAvailability(start: String, end: String) async throws -> [StaffAvailability] {
        try await get(
            Endpoint.staffAvailability,
            params: ["start": start, "end": end]
        )
    }
}
