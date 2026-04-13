import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Notification Preferences View

public struct NotificationPreferencesView: View {

    @State private var viewModel: NotificationPreferencesViewModel

    public init(apiClient: APIClient, authManager: AuthManager) {
        _viewModel = State(initialValue: NotificationPreferencesViewModel(apiClient: apiClient, authManager: authManager))
    }

    public var body: some View {
        content
            .navigationTitle("Notificaciones")
            .navigationBarTitleDisplayMode(.large)
            .scrollContentBackground(.hidden)
            .background(SolennixColors.surfaceGrouped)
            .task { await viewModel.loadPreferences() }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            settingsForm
        }
    }

    private var settingsForm: some View {
        Form {
            // Error
            if let error = viewModel.errorMessage {
                Section {
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.error)
                }
            }

            // Email preferences
            Section {
                preferenceToggle(
                    "Recibos de Pago",
                    description: "Recibe un correo cuando se registra un pago",
                    icon: "creditcard",
                    keyPath: \.emailPaymentReceipt
                )

                preferenceToggle(
                    "Recordatorio de Eventos",
                    description: "Recibe un correo 24h antes de tu evento",
                    icon: "calendar.badge.clock",
                    keyPath: \.emailEventReminder
                )

                preferenceToggle(
                    "Actualizaciones de Suscripcion",
                    description: "Correos sobre cambios en tu plan",
                    icon: "star",
                    keyPath: \.emailSubscriptionUpdates
                )

                preferenceToggle(
                    "Resumen Semanal",
                    description: "Resumen de actividad de la semana",
                    icon: "chart.bar",
                    keyPath: \.emailWeeklySummary
                )

                preferenceToggle(
                    "Noticias y Tips",
                    description: "Novedades y consejos de Solennix",
                    icon: "megaphone",
                    keyPath: \.emailMarketing
                )
            } header: {
                Text("Correos Electronicos")
            }

            // Push preferences
            Section {
                preferenceToggle(
                    "Notificaciones Push",
                    description: "Habilitar o deshabilitar todas las notificaciones push",
                    icon: "bell.badge",
                    keyPath: \.pushEnabled
                )

                preferenceToggle(
                    "Recordatorio de Eventos",
                    description: "Notificacion push antes de tu evento",
                    icon: "calendar.badge.clock",
                    keyPath: \.pushEventReminder
                )
                .disabled(!viewModel.pushEnabled)
                .opacity(viewModel.pushEnabled ? 1 : 0.5)

                preferenceToggle(
                    "Pago Recibido",
                    description: "Notificacion push cuando se registra un pago",
                    icon: "creditcard.fill",
                    keyPath: \.pushPaymentReceived
                )
                .disabled(!viewModel.pushEnabled)
                .opacity(viewModel.pushEnabled ? 1 : 0.5)
            } header: {
                Text("Notificaciones Push")
            }
        }
    }

    // MARK: - Toggle Row

    private func preferenceToggle(
        _ title: String,
        description: String,
        icon: String,
        keyPath: ReferenceWritableKeyPath<NotificationPreferencesViewModel, Bool>
    ) -> some View {
        Toggle(isOn: Binding(
            get: { viewModel[keyPath: keyPath] },
            set: { _ in
                Task { await viewModel.togglePreference(keyPath) }
            }
        )) {
            Label {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(title)
                    Text(description)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            } icon: {
                Image(systemName: icon)
            }
        }
        .tint(SolennixColors.primary)
    }
}

// MARK: - Preview

#Preview("Notification Preferences") {
    NavigationStack {
        NotificationPreferencesView(
            apiClient: APIClient(),
            authManager: AuthManager(keychain: KeychainHelper.standard)
        )
    }
}
