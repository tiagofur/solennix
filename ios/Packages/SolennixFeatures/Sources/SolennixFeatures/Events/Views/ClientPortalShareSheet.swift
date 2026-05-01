import SwiftUI
import UIKit
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Client Portal Share Sheet
//
// Organizer-facing sheet that manages the client-portal share link of a
// single event (PRD/12 feature A). Mirrors the web component
// `ClientPortalShareCard.tsx` with three UX states:
//
//   1. Loading — spinner while the initial GET is in flight
//   2. Has link — URL + Copy · Share (native) · Rotate · Revoke
//   3. No link — single "Generar enlace para el cliente" CTA
//
// Deviation vs web:
//   * The web "Share on WhatsApp" button is replaced with SwiftUI's native
//     `ShareLink`, which opens the system share sheet (includes WhatsApp
//     automatically, plus Mail, Messages, AirDrop, etc.) — better UX on iOS.
//   * Rotate / Revoke use `.confirmationDialog` instead of alerts to keep
//     the destructive-action affordance native to iOS.

public struct ClientPortalShareSheet: View {

    // MARK: - Properties

    @State private var viewModel: ClientPortalShareViewModel
    @State private var showRotateConfirm: Bool = false
    @State private var showRevokeConfirm: Bool = false
    @State private var copied: Bool = false

    @Environment(\.dismiss) private var dismiss
    @Environment(ToastManager.self) private var toastManager

    // MARK: - Init

    public init(apiClient: APIClient, eventId: String) {
        self._viewModel = State(
            initialValue: ClientPortalShareViewModel(
                apiClient: apiClient,
                eventId: eventId
            )
        )
    }

    // MARK: - Body

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    header

                    Group {
                        if viewModel.isLoading {
                            loadingState
                        } else if let link = viewModel.link {
                            linkActiveState(link)
                        } else {
                            emptyState
                        }
                    }
                }
                .padding(Spacing.lg)
            }
            .background(SolennixColors.background)
            .navigationTitle(ClientPortalShareStrings.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(QuickQuoteStrings.close) { dismiss() }
                        .foregroundStyle(SolennixColors.primary)
                }
            }
            .task { await viewModel.refresh() }
            .confirmationDialog(
                ClientPortalShareStrings.rotateLink,
                isPresented: $showRotateConfirm,
                titleVisibility: .visible
            ) {
                Button(ClientPortalShareStrings.rotateLink, role: .destructive) {
                    Task { await handleRotate() }
                }
                Button(ClientPortalShareStrings.cancel, role: .cancel) {}
            } message: {
                Text(ClientPortalShareStrings.rotateMessage)
            }
            .confirmationDialog(
                ClientPortalShareStrings.disableLink,
                isPresented: $showRevokeConfirm,
                titleVisibility: .visible
            ) {
                Button(ClientPortalShareStrings.disable, role: .destructive) {
                    Task { await handleRevoke() }
                }
                Button(ClientPortalShareStrings.cancel, role: .cancel) {}
            } message: {
                Text(ClientPortalShareStrings.disableMessage)
            }
            .onChange(of: viewModel.errorMessage) { _, newValue in
                if let message = newValue {
                    toastManager.show(message: message, type: .error)
                    viewModel.errorMessage = nil
                }
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            ZStack {
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .fill(SolennixColors.primaryLight)
                    .frame(width: 44, height: 44)

                Image(systemName: "person.2.circle.fill")
                    .font(.title2)
                    .foregroundStyle(SolennixColors.primary)
            }

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(ClientPortalShareStrings.title)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)

                Text(ClientPortalShareStrings.description)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
    }

    // MARK: - Loading State

    private var loadingState: some View {
        HStack(spacing: Spacing.sm) {
            ProgressView()
            Text(ClientPortalShareStrings.loading)
                .font(.caption)
                .foregroundStyle(SolennixColors.textTertiary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
    }

    // MARK: - Active Link State

    @ViewBuilder
    private func linkActiveState(_ link: EventPublicLink) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            urlCard(link.url)

            actionButtons(link)

            if let expiresAt = link.expiresAt, !expiresAt.isEmpty {
                expirationLabel(expiresAt)
            } else {
                Text(ClientPortalShareStrings.noExpiry)
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
        }
    }

    private func urlCard(_ url: String) -> some View {
        Text(url)
            .font(.system(.footnote, design: .monospaced))
            .foregroundStyle(SolennixColors.textSecondary)
            .textSelection(.enabled)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Spacing.md)
            .background(SolennixColors.surfaceAlt)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(SolennixColors.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    @ViewBuilder
    private func actionButtons(_ link: EventPublicLink) -> some View {
        VStack(spacing: Spacing.sm) {
            // Primary: Copy
            Button {
                handleCopy(link.url)
            } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: copied ? "checkmark.circle.fill" : "doc.on.doc")
                    Text(copied ? ClientPortalShareStrings.copied : ClientPortalShareStrings.copyLink)
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.md)
                .background(SolennixGradient.premium)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
            .disabled(viewModel.isBusy)

            // Secondary: Native share sheet (WhatsApp + Mail + Messages + …)
            if let shareURL = URL(string: link.url) {
                ShareLink(
                    item: shareURL,
                    subject: Text(ClientPortalShareStrings.shareSubject),
                    message: Text(ClientPortalShareStrings.shareMessage(link.url))
                ) {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "square.and.arrow.up")
                        Text(ClientPortalShareStrings.share)
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(SolennixColors.surface)
                    .foregroundStyle(SolennixColors.text)
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(SolennixColors.border, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }
                .disabled(viewModel.isBusy)
            }

            // Rotate
            Button {
                showRotateConfirm = true
            } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "arrow.triangle.2.circlepath")
                    Text(ClientPortalShareStrings.rotateLink)
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.md)
                .background(SolennixColors.surface)
                .foregroundStyle(SolennixColors.textSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .stroke(SolennixColors.border, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
            .disabled(viewModel.isBusy)

            // Revoke (destructive)
            Button {
                showRevokeConfirm = true
            } label: {
                HStack(spacing: Spacing.sm) {
                    if viewModel.isBusy {
                        ProgressView().tint(SolennixColors.error)
                    } else {
                        Image(systemName: "link.badge.minus")
                    }
                    Text(ClientPortalShareStrings.disable)
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.md)
                .background(SolennixColors.errorBg)
                .foregroundStyle(SolennixColors.error)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
            .disabled(viewModel.isBusy)
        }
    }

    private func expirationLabel(_ expiresAt: String) -> some View {
        let formatted = formatExpiration(expiresAt)
        return HStack(spacing: Spacing.xs) {
            Image(systemName: "clock")
                .font(.caption2)
            Text("\(ClientPortalShareStrings.expiryPrefix) \(formatted)")
                .font(.caption2)
        }
        .foregroundStyle(SolennixColors.textTertiary)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(ClientPortalShareStrings.emptyState)
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            PremiumButton(
                title: ClientPortalShareStrings.generateLink,
                isLoading: viewModel.isBusy
            ) {
                Task { await handleCreate() }
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
    }

    // MARK: - Actions

    private func handleCopy(_ url: String) {
        UIPasteboard.general.string = url
        withAnimation(.easeInOut(duration: 0.2)) { copied = true }
        toastManager.show(message: ClientPortalShareStrings.copyToast, type: .success)
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            await MainActor.run {
                withAnimation(.easeInOut(duration: 0.2)) { copied = false }
            }
        }
    }

    @MainActor
    private func handleCreate() async {
        let ok = await viewModel.createOrRotate()
        if ok {
            toastManager.show(message: ClientPortalShareStrings.generatedToast, type: .success)
        }
    }

    @MainActor
    private func handleRotate() async {
        let ok = await viewModel.createOrRotate()
        if ok {
            toastManager.show(message: ClientPortalShareStrings.rotatedToast, type: .success)
        }
    }

    @MainActor
    private func handleRevoke() async {
        let ok = await viewModel.revoke()
        if ok {
            toastManager.show(message: ClientPortalShareStrings.disabledToast, type: .info)
        }
    }

    // MARK: - Helpers

    /// Formats an ISO 8601 UTC timestamp into a short local-date string.
    /// Falls back to the raw value if parsing fails so the UI still renders.
    private func formatExpiration(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: iso) {
            return date.formatted(date: .abbreviated, time: .shortened)
        }
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: iso) {
            return date.formatted(date: .abbreviated, time: .shortened)
        }
        return iso
    }
}

// MARK: - Preview

#Preview("Client Portal Share") {
    ClientPortalShareSheet(apiClient: APIClient(), eventId: "preview-event")
        .environment(ToastManager())
}
