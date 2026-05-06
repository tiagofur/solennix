import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Staff Form View Model

@MainActor
@Observable
public final class StaffFormViewModel {

    // MARK: - Form Fields

    public var name: String = ""
    public var roleLabel: String = ""
    public var phone: String = ""
    public var email: String = ""
    public var notes: String = ""
    public var notificationEmailOptIn: Bool = false

    // MARK: - UI State

    public var isLoading: Bool = false
    public var isSaving: Bool = false
    public var errorMessage: String?
    public var isEdit: Bool = false
    public var editId: String?

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Validation

    public var isNameValid: Bool {
        name.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2
    }

    /// El email es opcional, pero si se activa el opt-in debe ser valido.
    public var isEmailValidIfProvided: Bool {
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return true }
        return trimmed.contains("@") && trimmed.contains(".")
    }

    /// Si el opt-in esta activo, se exige email valido.
    public var isOptInConsistent: Bool {
        if !notificationEmailOptIn { return true }
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty && isEmailValidIfProvided
    }

    public var isFormValid: Bool {
        isNameValid && isEmailValidIfProvided && isOptInConsistent
    }

    // MARK: - Load Staff (Edit Mode)

    @MainActor
    public func loadStaff(id: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let item: Staff = try await apiClient.get(Endpoint.staff(id))
            name = item.name
            roleLabel = item.roleLabel ?? ""
            phone = item.phone ?? ""
            email = item.email ?? ""
            notes = item.notes ?? ""
            notificationEmailOptIn = item.notificationEmailOptIn
            isEdit = true
            editId = item.id
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    // MARK: - Save

    @MainActor
    public func save() async throws -> Staff {
        // Body — campos opcionales solo si no estan vacios.
        // `notification_email_opt_in` siempre va (bool requerido).
        var body: [String: Any] = [
            "name": name.trimmingCharacters(in: .whitespacesAndNewlines),
            "notification_email_opt_in": notificationEmailOptIn,
        ]

        let trimmedRole = roleLabel.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedRole.isEmpty {
            body["role_label"] = trimmedRole
        }

        let trimmedPhone = phone.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedPhone.isEmpty {
            body["phone"] = trimmedPhone
        }

        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedEmail.isEmpty {
            body["email"] = trimmedEmail
        }

        let trimmedNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedNotes.isEmpty {
            body["notes"] = trimmedNotes
        }

        if isEdit, let editId {
            let updated: Staff = try await apiClient.put(
                Endpoint.staff(editId),
                body: AnyCodable(body)
            )
            return updated
        } else {
            let created: Staff = try await apiClient.post(
                Endpoint.staff,
                body: AnyCodable(body)
            )
            return created
        }
    }

    // MARK: - Validate and Save

    @MainActor
    public func validateAndSave() async -> Staff? {
        guard isNameValid else {
            errorMessage = "El nombre debe tener al menos 2 caracteres"
            return nil
        }
        guard isEmailValidIfProvided else {
            errorMessage = "El email no parece valido"
            return nil
        }
        guard isOptInConsistent else {
            errorMessage = "Para activar el aviso por email necesitas un email valido"
            return nil
        }

        isSaving = true
        errorMessage = nil

        do {
            let saved = try await save()
            HapticsHelper.play(.success)
            isSaving = false
            return saved
        } catch {
            HapticsHelper.play(.error)
            errorMessage = mapError(error)
            isSaving = false
            return nil
        }
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? "Ocurrio un error inesperado."
        }
        return "Ocurrio un error inesperado. Intenta de nuevo."
    }
}
