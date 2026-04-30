import Foundation
import Observation
import PhotosUI
import SwiftUI
import SolennixCore
import SolennixNetwork

// MARK: - Business Settings Request Bodies

private struct BusinessInfoBody: Encodable {
    let businessName: String
    let showBusinessNameInPdf: Bool
    let brandColor: String
}

private struct ContractDefaultsBody: Encodable {
    let defaultDepositPercent: Double
    let defaultCancellationDays: Double
    let defaultRefundPercent: Double
    let contractTemplate: String
}

// MARK: - Business Settings View Model

@Observable
public final class BusinessSettingsViewModel {

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    // MARK: - Properties

    public var user: User?
    public var isLoading: Bool = false
    public var isSaving: Bool = false
    public var errorMessage: String?

    // Business info
    public var businessName: String = ""
    public var showBusinessNameInPdf: Bool = true
    public var brandColor: Color = .blue

    // Contract defaults
    public var depositPercent: Double = 50
    public var cancellationDays: Double = 7
    public var refundPercent: Double = 50
    public var contractTemplate: String = ""

    // Logo
    public var logoUrl: String?
    public var selectedPhoto: PhotosPickerItem?
    public var isUploadingLogo: Bool = false

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Load User

    @MainActor
    public func loadUser() async {
        isLoading = true
        errorMessage = nil

        do {
            user = try await apiClient.get(Endpoint.me)
            populateForm()
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    private func populateForm() {
        guard let user = user else { return }

        businessName = user.businessName ?? ""
        showBusinessNameInPdf = user.showBusinessNameInPdf ?? true
        logoUrl = user.logoUrl
        depositPercent = user.defaultDepositPercent ?? 50
        cancellationDays = user.defaultCancellationDays ?? 7
        refundPercent = user.defaultRefundPercent ?? 50
        contractTemplate = user.contractTemplate ?? ""

        // Parse brand color from hex
        if let hex = user.brandColor {
            brandColor = Color(hex: hex) ?? .blue
        }
    }

    // MARK: - Save Business Settings

    @MainActor
    public func saveBusinessSettings() async -> Bool {
        isSaving = true
        errorMessage = nil

        do {
            let body = BusinessInfoBody(
                businessName: businessName.trimmingCharacters(in: .whitespacesAndNewlines),
                showBusinessNameInPdf: showBusinessNameInPdf,
                brandColor: brandColor.toHex() ?? "#007AFF"
            )
            user = try await apiClient.put(Endpoint.updateProfile, body: body)
            isSaving = false
            return true
        } catch {
            errorMessage = mapError(error)
            isSaving = false
            return false
        }
    }

    // MARK: - Save Contract Defaults

    @MainActor
    public func saveContractDefaults() async -> Bool {
        isSaving = true
        errorMessage = nil

        do {
            let body = ContractDefaultsBody(
                defaultDepositPercent: depositPercent,
                defaultCancellationDays: cancellationDays,
                defaultRefundPercent: refundPercent,
                contractTemplate: contractTemplate.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            user = try await apiClient.put(Endpoint.updateProfile, body: body)
            isSaving = false
            return true
        } catch {
            errorMessage = mapError(error)
            isSaving = false
            return false
        }
    }

    // MARK: - Upload Logo

    @MainActor
    public func handleLogoSelection() async {
        guard let selectedPhoto = selectedPhoto else { return }

        isUploadingLogo = true
        errorMessage = nil

        do {
            guard let data = try await selectedPhoto.loadTransferable(type: Data.self) else {
                errorMessage = tr("settings.business.logo.load_error", "No se pudo cargar la imagen")
                isUploadingLogo = false
                return
            }

            let response: UploadResponse = try await apiClient.upload(
                Endpoint.uploadImage,
                data: data,
                filename: "logo.jpg"
            )

            // Update profile with new logo URL
            let body = ["logo_url": response.url]
            user = try await apiClient.put(Endpoint.updateProfile, body: body)
            logoUrl = response.url
        } catch {
            errorMessage = mapError(error)
        }

        isUploadingLogo = false
        self.selectedPhoto = nil
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? tr("common.error.unexpected", "Ocurrió un error inesperado.")
        }
        return tr("common.error.retry", "Ocurrió un error inesperado. Intenta de nuevo.")
    }
}

// MARK: - Color Extensions

extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        guard hexSanitized.count == 6 else { return nil }

        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)

        self.init(
            red: Double((rgb & 0xFF0000) >> 16) / 255.0,
            green: Double((rgb & 0x00FF00) >> 8) / 255.0,
            blue: Double(rgb & 0x0000FF) / 255.0
        )
    }

    func toHex() -> String? {
        guard let components = UIColor(self).cgColor.components else { return nil }

        let r = Int(components[0] * 255)
        let g = Int(components.count > 1 ? components[1] * 255 : components[0] * 255)
        let b = Int(components.count > 2 ? components[2] * 255 : components[0] * 255)

        return String(format: "#%02X%02X%02X", r, g, b)
    }
}
