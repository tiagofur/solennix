import SwiftUI
import SolennixCore
import SolennixDesign

/// Reusable paywall sheet shown when the user hits a plan limit.
/// Displays the limit message from the backend and a CTA to upgrade.
struct PaywallSheet: View {
    let message: String
    let onUpgrade: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            // Icon
            Image(systemName: "lock.fill")
                .font(.system(size: 44))
                .foregroundStyle(SolennixColors.primary)
                .padding(.top, 8)

            // Title
            Text("Límite alcanzado")
                .font(.title2.bold())
                .foregroundStyle(SolennixColors.text)

            // Message from backend
            Text(message)
                .font(.body)
                .foregroundStyle(SolennixColors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 8)

            // Upgrade CTA
            PremiumButton(title: "Ver planes") {
                onUpgrade()
            }

            // Dismiss
            Button("Cerrar") {
                onDismiss()
            }
            .foregroundStyle(SolennixColors.textSecondary)
            .padding(.bottom, 8)
        }
        .padding(24)
        .background(SolennixColors.surface)
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }
}
