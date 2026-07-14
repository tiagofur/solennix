import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Notification Preferences View

public struct NotificationPreferencesView: View {

    @State private var viewModel: NotificationPreferencesViewModel
    @State private var scoped: ViewScopedTask?

    public init(apiClient: APIClient, authManager: AuthManager) {
        _viewModel = State(initialValue: NotificationPreferencesViewModel(apiClient: apiClient, authManager: authManager))
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    public var body: some View {
        content
            .navigationTitle(tr("settings.tab.notifications", "Notificaciones"))
            .navigationBarTitleDisplayMode(.inline)
            .solennixListStyle()
            .task { await viewModel.loadPreferences() }
            .viewScopedTask(scoped: $scoped)
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
                        .solennixRow()
                }
            }

            // Email preferences
            Section {
                preferenceToggle(
                    tr("settings.notifications.email_payment_receipt", "Recibos de pago"),
                    description: tr("settings.notifications.email_payment_receipt_hint", "Recibe un correo cuando se registra un pago"),
                    icon: "creditcard",
                    keyPath: \.emailPaymentReceipt,
                    id: "emailPaymentReceipt"
                )

                preferenceToggle(
                    tr("settings.notifications.email_event_reminder", "Recordatorio de eventos"),
                    description: tr("settings.notifications.email_event_reminder_hint", "Recibe un correo 24h antes de tu evento"),
                    icon: "calendar.badge.clock",
                    keyPath: \.emailEventReminder,
                    id: "emailEventReminder"
                )

                preferenceToggle(
                    tr("settings.notifications.email_subscription_updates", "Actualizaciones de suscripción"),
                    description: tr("settings.notifications.email_subscription_updates_hint", "Correos sobre cambios en tu plan"),
                    icon: "star",
                    keyPath: \.emailSubscriptionUpdates,
                    id: "emailSubscriptionUpdates"
                )

                preferenceToggle(
                    tr("settings.notifications.email_weekly_summary", "Resumen semanal"),
                    description: tr("settings.notifications.email_weekly_summary_hint", "Resumen de actividad de la semana"),
                    icon: "chart.bar",
                    keyPath: \.emailWeeklySummary,
                    id: "emailWeeklySummary"
                )

                preferenceToggle(
                    tr("settings.notifications.email_marketing", "Noticias y tips"),
                    description: tr("settings.notifications.email_marketing_hint", "Novedades y consejos de Solennix"),
                    icon: "megaphone",
                    keyPath: \.emailMarketing,
                    id: "emailMarketing"
                )
            } header: {
                Text(tr("settings.notifications.email_section", "Correos electrónicos"))
            }

            // Push preferences
            Section {
                preferenceToggle(
                    tr("settings.notifications.push_enabled", "Notificaciones push"),
                    description: tr("settings.notifications.push_enabled_hint", "Habilitar o deshabilitar todas las notificaciones push"),
                    icon: "bell.badge",
                    keyPath: \.pushEnabled,
                    id: "pushEnabled"
                )

                preferenceToggle(
                    tr("settings.notifications.push_event_reminder", "Recordatorio de eventos"),
                    description: tr("settings.notifications.push_event_reminder_hint", "Notificación push antes de tu evento"),
                    icon: "calendar.badge.clock",
                    keyPath: \.pushEventReminder,
                    id: "pushEventReminder"
                )
                .disabled(!viewModel.pushEnabled)
                .opacity(viewModel.pushEnabled ? 1 : 0.5)

                preferenceToggle(
                    tr("settings.notifications.push_payment_received", "Pago recibido"),
                    description: tr("settings.notifications.push_payment_received_hint", "Notificación push cuando se registra un pago"),
                    icon: "creditcard.fill",
                    keyPath: \.pushPaymentReceived,
                    id: "pushPaymentReceived"
                )
                .disabled(!viewModel.pushEnabled)
                .opacity(viewModel.pushEnabled ? 1 : 0.5)
            } header: {
                Text(tr("settings.notifications.push_section", "Notificaciones push"))
            }
        }
    }

    // MARK: - Toggle Row

    private func preferenceToggle(
        _ title: String,
        description: String,
        icon: String,
        keyPath: ReferenceWritableKeyPath<NotificationPreferencesViewModel, Bool>,
        id: String
    ) -> some View {
        Toggle(isOn: Binding(
            get: { viewModel[keyPath: keyPath] },
            set: { _ in
                scoped?.start { await viewModel.togglePreference(keyPath, id: id) }
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
        .disabled(viewModel.inFlightKeys.contains(id))
        .solennixRow()
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
