import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Account Deletion View

public struct AccountDeletionView: View {

    @State private var viewModel: SettingsViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(ToastManager.self) private var toastManager

    // MARK: - @ScaledMetric sizes (Dynamic Type-safe, capped)
    @ScaledMetric(relativeTo: .body) private var successIconSize: CGFloat = 64
    private var cappedSuccessIconSize: CGFloat { min(successIconSize, 80) }

    public init(apiClient: APIClient, authManager: AuthManager) {
        _viewModel = State(initialValue: SettingsViewModel(apiClient: apiClient, authManager: authManager))
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                headerSection
                whatHappensSection
                graceSection
                consentSection

                if let error = viewModel.deleteOwnAccountError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.error)
                        .padding(.horizontal, Spacing.md)
                }

                deleteButton
                    .padding(.horizontal, Spacing.md)

                Spacer(minLength: Spacing.xl)
            }
            .padding(.vertical, Spacing.lg)
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(SettingsStrings.deleteAccountTitle)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(viewModel.isDeletingOwnAccount || viewModel.deleteOwnAccountSuccess)
        .overlay {
            if viewModel.deleteOwnAccountSuccess {
                successOverlay
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.title2)
                    .foregroundStyle(SolennixColors.error)
                Text(SettingsStrings.deleteAccountSubtitle)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)
            }

            Text(SettingsStrings.deleteAccountIntro)
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.error.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.card)
                .stroke(SolennixColors.error.opacity(0.3), lineWidth: 1)
        )
        .padding(.horizontal, Spacing.md)
    }

    // MARK: - What Happens Section

    private var whatHappensSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(SettingsStrings.deleteAccountWhatHappensTitle)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.text)
                .padding(.bottom, 2)

            deletionItem(
                icon: "calendar.badge.minus",
                text: SettingsStrings.deleteAccountItemEvents
            )
            deletionItem(
                icon: "creditcard.slash",
                text: SettingsStrings.deleteAccountItemSub
            )
            deletionItem(
                icon: "lock.shield",
                text: SettingsStrings.deleteAccountItemLogs
            )
        }
        .padding(Spacing.md)
        .solennixCard(border: false)
        .padding(.horizontal, Spacing.md)
    }

    private func deletionItem(icon: String, text: String) -> some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .frame(width: 22)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    // MARK: - Grace Period Section

    private var graceSection: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: "clock.badge.checkmark")
                .font(.title3)
                .foregroundStyle(SolennixColors.warning)
                .padding(.top, 2)
            Text(SettingsStrings.deleteAccountGraceWarning)
                .font(.subheadline)
                .foregroundStyle(SolennixColors.text)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Spacing.md)
        .background(SolennixColors.warning.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.card)
                .stroke(SolennixColors.warning.opacity(0.3), lineWidth: 1)
        )
        .padding(.horizontal, Spacing.md)
    }

    // MARK: - Consent Section

    private var consentSection: some View {
        Button {
            HapticsHelper.play(.selection)
            viewModel.confirmDeletionConsent.toggle()
        } label: {
            HStack(alignment: .top, spacing: Spacing.sm) {
                Image(systemName: viewModel.confirmDeletionConsent ? "checkmark.square.fill" : "square")
                    .font(.title3)
                    .foregroundStyle(viewModel.confirmDeletionConsent ? SolennixColors.error : SolennixColors.textTertiary)
                    .animation(.easeInOut(duration: 0.15), value: viewModel.confirmDeletionConsent)

                Text(SettingsStrings.deleteAccountConfirmCheckbox)
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.text)
                    .fixedSize(horizontal: false, vertical: true)
                    .multilineTextAlignment(.leading)
            }
            .padding(Spacing.md)
            .solennixCard(shadow: false, border: false)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.card)
                    .stroke(
                        viewModel.confirmDeletionConsent ? SolennixColors.error.opacity(0.5) : SolennixColors.border,
                        lineWidth: 1
                    )
            )
        }
        .buttonStyle(.plain)
        .padding(.horizontal, Spacing.md)
    }

    // MARK: - Delete Button

    private var deleteButton: some View {
        Button {
            HapticsHelper.play(.warning)
            Task { await viewModel.deleteOwnAccount() }
        } label: {
            HStack {
                if viewModel.isDeletingOwnAccount {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(0.85)
                        .padding(.trailing, 4)
                    Text(SettingsStrings.deleteAccountDeleting)
                } else {
                    Image(systemName: "trash")
                    Text(SettingsStrings.deleteAccountButton)
                }
            }
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(Spacing.md)
            .background(
                viewModel.confirmDeletionConsent && !viewModel.isDeletingOwnAccount
                    ? SolennixColors.error
                    : SolennixColors.error.opacity(0.4)
            )
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            .animation(.easeInOut(duration: 0.2), value: viewModel.confirmDeletionConsent)
        }
        .disabled(!viewModel.confirmDeletionConsent || viewModel.isDeletingOwnAccount)
    }

    // MARK: - Success Overlay

    private var successOverlay: some View {
        ZStack {
            SolennixColors.surfaceGrouped
                .ignoresSafeArea()

            VStack(spacing: Spacing.lg) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: cappedSuccessIconSize))
                    .foregroundStyle(SolennixColors.success)

                VStack(spacing: Spacing.sm) {
                    Text(SettingsStrings.deleteAccountSuccessTitle)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.text)

                    Text(SettingsStrings.deleteAccountSuccessMessage)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.lg)
                        .fixedSize(horizontal: false, vertical: true)
                }

                HStack(spacing: Spacing.xs) {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text(SettingsStrings.deleteAccountLoggingOut)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
                .padding(.top, Spacing.sm)
            }
            .padding(Spacing.xl)
        }
        .transition(.opacity.combined(with: .scale(scale: 0.95)))
        .animation(.easeInOut(duration: 0.3), value: viewModel.deleteOwnAccountSuccess)
    }
}
