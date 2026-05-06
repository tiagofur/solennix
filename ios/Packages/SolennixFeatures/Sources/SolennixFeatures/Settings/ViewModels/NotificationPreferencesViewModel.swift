import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Notification Preferences Request Body

private struct NotificationPreferencesBody: Encodable {
    var emailPaymentReceipt: Bool?
    var emailEventReminder: Bool?
    var emailSubscriptionUpdates: Bool?
    var emailWeeklySummary: Bool?
    var emailMarketing: Bool?
    var pushEnabled: Bool?
    var pushEventReminder: Bool?
    var pushPaymentReceived: Bool?
}

// MARK: - Notification Preferences View Model

@MainActor
@Observable
public final class NotificationPreferencesViewModel {

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    // MARK: - Properties

    public var isLoading: Bool = false
    public var errorMessage: String?

    // Email preferences
    public var emailPaymentReceipt: Bool = true
    public var emailEventReminder: Bool = true
    public var emailSubscriptionUpdates: Bool = true
    public var emailWeeklySummary: Bool = false
    public var emailMarketing: Bool = false

    // Push preferences
    public var pushEnabled: Bool = true
    public var pushEventReminder: Bool = true
    public var pushPaymentReceived: Bool = true

    // MARK: - Dependencies

    private let apiClient: APIClient
    private let authManager: AuthManager

    // MARK: - Init

    public init(apiClient: APIClient, authManager: AuthManager) {
        self.apiClient = apiClient
        self.authManager = authManager
    }

    // MARK: - Load

    @MainActor
    public func loadPreferences() async {
        isLoading = true
        errorMessage = nil

        do {
            let user: User = try await apiClient.get(Endpoint.me)
            populateForm(user)
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    private func populateForm(_ user: User) {
        emailPaymentReceipt = user.emailPaymentReceipt ?? true
        emailEventReminder = user.emailEventReminder ?? true
        emailSubscriptionUpdates = user.emailSubscriptionUpdates ?? true
        emailWeeklySummary = user.emailWeeklySummary ?? false
        emailMarketing = user.emailMarketing ?? false
        pushEnabled = user.pushEnabled ?? true
        pushEventReminder = user.pushEventReminder ?? true
        pushPaymentReceived = user.pushPaymentReceived ?? true
    }

    // MARK: - Toggle (saves immediately)

    @MainActor
    public func togglePreference(_ keyPath: ReferenceWritableKeyPath<NotificationPreferencesViewModel, Bool>) async {
        let oldValue = self[keyPath: keyPath]
        self[keyPath: keyPath] = !oldValue
        errorMessage = nil

        let body = NotificationPreferencesBody(
            emailPaymentReceipt: emailPaymentReceipt,
            emailEventReminder: emailEventReminder,
            emailSubscriptionUpdates: emailSubscriptionUpdates,
            emailWeeklySummary: emailWeeklySummary,
            emailMarketing: emailMarketing,
            pushEnabled: pushEnabled,
            pushEventReminder: pushEventReminder,
            pushPaymentReceived: pushPaymentReceived
        )

        do {
            let _: User = try await apiClient.put(Endpoint.updateProfile, body: body)
        } catch {
            // Rollback on failure
            self[keyPath: keyPath] = oldValue
            errorMessage = mapError(error)
        }
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? tr("common.error.unexpected", "Ocurrió un error inesperado.")
        }
        return tr("common.error.retry", "Ocurrió un error inesperado. Intenta de nuevo.")
    }
}
