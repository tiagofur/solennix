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
    @Published public var planLimitMessage: String?
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
            errorMessage = "El nombre debe tener al menos 2 caracteres"
            return nil
        }
        guard isPhoneValid else {
            errorMessage = "El telefono debe tener al menos 10 digitos"
            return nil
        }

        isSaving = true
        errorMessage = nil

        do {
            let client = try await save()
            HapticsHelper.play(.success)
            isSaving = false
            return client
        } catch let error as APIError {
            HapticsHelper.play(.error)
            isSaving = false
            if case .planLimitExceeded(let message, _, _, _) = error {
                planLimitMessage = message
            } else {
                errorMessage = mapError(error)
            }
            return nil
        } catch {
            HapticsHelper.play(.error)
            isSaving = false
            errorMessage = mapError(error)
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
