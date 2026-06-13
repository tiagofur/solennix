import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Staff Form View Model

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

    // MARK: - Haptic Counters (observed by StaffFormView via .sensoryFeedback)

    /// Incremented on successful save — triggers `.sensoryFeedback(.success, trigger:)`.
    public var saveSuccessCounter: Int = 0
    /// Incremented on save error — triggers `.sensoryFeedback(.error, trigger:)`.
    public var saveErrorCounter: Int = 0

    // MARK: - Dirty State

    private var initialName: String = ""
    private var initialRoleLabel: String = ""
    private var initialPhone: String = ""
    private var initialEmail: String = ""
    private var initialNotes: String = ""
    private var initialNotificationEmailOptIn: Bool = false

    /// True when any field differs from its loaded (or default) initial value.
    public var isDirty: Bool {
        name != initialName
            || roleLabel != initialRoleLabel
            || phone != initialPhone
            || email != initialEmail
            || notes != initialNotes
            || notificationEmailOptIn != initialNotificationEmailOptIn
    }

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

    /// El email es opcional, pero si se activa el opt-in debe ser válido.
    public var isEmailValidIfProvided: Bool {
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return true }
        // Require at least one char before @, chars between @ and ., and char(s) after .
        let parts = trimmed.split(separator: "@", maxSplits: 1)
        guard parts.count == 2, !parts[0].isEmpty else { return false }
        let domainParts = parts[1].split(separator: ".", maxSplits: 1)
        guard domainParts.count == 2, !domainParts[0].isEmpty, !domainParts[1].isEmpty else { return false }
        return true
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
            // Snapshot initial values so isDirty can compare
            initialName = name
            initialRoleLabel = roleLabel
            initialPhone = phone
            initialEmail = email
            initialNotes = notes
            initialNotificationEmailOptIn = notificationEmailOptIn
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
            errorMessage = StaffStrings.validationNameMin
            return nil
        }
        guard isEmailValidIfProvided else {
            errorMessage = StaffStrings.validationEmailInvalid
            return nil
        }
        guard isOptInConsistent else {
            errorMessage = StaffStrings.validationOptInEmailRequired
            return nil
        }

        isSaving = true
        errorMessage = nil

        do {
            let saved = try await save()
            saveSuccessCounter &+= 1
            isSaving = false
            return saved
        } catch {
            saveErrorCounter &+= 1
            errorMessage = mapError(error)
            isSaving = false
            return nil
        }
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? StaffStrings.unexpectedError
        }
        return StaffStrings.unexpectedErrorRetry
    }
}
