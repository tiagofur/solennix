import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Client Form View Model

@Observable
public final class ClientFormViewModel {

    // MARK: - Form Fields

    public var name: String = ""
    public var phone: String = ""
    public var email: String = ""
    public var address: String = ""
    public var city: String = ""
    public var notes: String = ""
    public var photoURL: String?
    public var selectedPhotoData: Data?

    // MARK: - UI State

    public var isLoading: Bool = false
    public var isSaving: Bool = false
    public var errorMessage: String?
    public var planLimitMessage: String?
    public var isEdit: Bool = false
    public var editId: String?

    // MARK: - Haptic Counters (observed by ClientFormView via .sensoryFeedback)

    /// Incremented on successful save — triggers `.sensoryFeedback(.success, trigger:)`.
    public var saveSuccessCounter: Int = 0
    /// Incremented on save error — triggers `.sensoryFeedback(.error, trigger:)`.
    public var saveErrorCounter: Int = 0

    // MARK: - Dirty State

    private var initialName: String = ""
    private var initialPhone: String = ""
    private var initialEmail: String = ""
    private var initialAddress: String = ""
    private var initialCity: String = ""
    private var initialNotes: String = ""

    /// True when any field differs from its loaded (or default empty) initial value.
    public var isDirty: Bool {
        name != initialName
            || phone != initialPhone
            || email != initialEmail
            || address != initialAddress
            || city != initialCity
            || notes != initialNotes
            || selectedPhotoData != nil
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

    public var isPhoneValid: Bool {
        let digits = phone.filter { $0.isNumber }
        return digits.count >= 10
    }

    public var isFormValid: Bool {
        isNameValid && isPhoneValid
    }

    // MARK: - Load Client (Edit Mode)

    @MainActor
    public func loadClient(id: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let client: Client = try await apiClient.get(Endpoint.client(id))
            name = client.name
            phone = client.phone
            email = client.email ?? ""
            address = client.address ?? ""
            city = client.city ?? ""
            notes = client.notes ?? ""
            photoURL = client.photoUrl
            isEdit = true
            editId = client.id
            // Snapshot initial values so isDirty can compare
            initialName = name
            initialPhone = phone
            initialEmail = email
            initialAddress = address
            initialCity = city
            initialNotes = notes
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    // MARK: - Save

    @MainActor
    public func save() async throws -> Client {
        // Upload photo if new data selected
        var finalPhotoURL = photoURL
        if let photoData = selectedPhotoData {
            let uploadResponse = try await apiClient.upload(
                Endpoint.uploadImage,
                data: photoData,
                filename: "client_photo.jpg"
            )
            finalPhotoURL = uploadResponse.url
        }

        // Build request body
        var body: [String: String] = [
            "name": name.trimmingCharacters(in: .whitespacesAndNewlines),
            "phone": phone.trimmingCharacters(in: .whitespacesAndNewlines),
        ]

        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedEmail.isEmpty {
            body["email"] = trimmedEmail
        }

        let trimmedAddress = address.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedAddress.isEmpty {
            body["address"] = trimmedAddress
        }

        let trimmedCity = city.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedCity.isEmpty {
            body["city"] = trimmedCity
        }

        let trimmedNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedNotes.isEmpty {
            body["notes"] = trimmedNotes
        }

        if let finalPhotoURL {
            body["photo_url"] = finalPhotoURL
        }

        // POST or PUT
        if isEdit, let editId {
            let client: Client = try await apiClient.put(Endpoint.client(editId), body: body)
            return client
        } else {
            let client: Client = try await apiClient.post(Endpoint.clients, body: body)
            return client
        }
    }

    // MARK: - Validate and Save

    @MainActor
    public func validateAndSave() async -> Client? {
        guard isNameValid else {
            errorMessage = FeatureL10n.text("clients.form.validation.name_min", "El nombre debe tener al menos 2 caracteres")
            return nil
        }
        guard isPhoneValid else {
            errorMessage = FeatureL10n.text("clients.form.validation.phone_min", "El teléfono debe tener al menos 10 dígitos")
            return nil
        }

        isSaving = true
        errorMessage = nil

        do {
            let client = try await save()
            saveSuccessCounter &+= 1
            isSaving = false
            return client
        } catch let error as APIError {
            saveErrorCounter &+= 1
            isSaving = false
            if case .planLimitExceeded(let message, _, _, _) = error {
                planLimitMessage = message
            } else {
                errorMessage = mapError(error)
            }
            return nil
        } catch {
            saveErrorCounter &+= 1
            isSaving = false
            errorMessage = mapError(error)
            return nil
        }
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription
                ?? FeatureL10n.text("clients.error.unexpected", "Ocurrió un error inesperado.")
        }
        return FeatureL10n.text("clients.error.unexpected_retry", "Ocurrió un error inesperado. Intenta de nuevo.")
    }
}
