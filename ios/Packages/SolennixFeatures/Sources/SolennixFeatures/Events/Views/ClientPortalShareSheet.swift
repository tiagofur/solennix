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
            .navigationTitle(tr("events.detail.share.title", "Portal del cliente"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(tr("events.detail.share.close", "Cerrar")) { dismiss() }
                        .foregroundStyle(SolennixColors.primary)
                }
            }
            .task { await viewModel.refresh() }
            .confirmationDialog(
                tr("events.detail.share.rotate", "Rotar enlace"),
                isPresented: $showRotateConfirm,
                titleVisibility: .visible
            ) {
                Button(tr("events.detail.share.rotate", "Rotar enlace"), role: .destructive) {
                    Task { await handleRotate() }
                }
                Button(tr("events.form.cancel", "Cancelar"), role: .cancel) {}
            } message: {
                Text(tr("events.detail.share.confirm_rotate", "Al rotar el enlace, el que ya compartiste dejará de funcionar. ¿Continuamos?"))
            }
            .confirmationDialog(
                tr("events.detail.share.revoke", "Deshabilitar enlace"),
                isPresented: $showRevokeConfirm,
                titleVisibility: .visible
            ) {
                Button(tr("events.detail.share.revoke_short", "Deshabilitar"), role: .destructive) {
                    Task { await handleRevoke() }
                }
                Button(tr("events.form.cancel", "Cancelar"), role: .cancel) {}
            } message: {
                Text(tr("events.detail.share.confirm_revoke", "Se va a deshabilitar el enlace para el cliente. ¿Estás seguro?"))
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
                Text(tr("events.detail.share.title", "Portal del cliente"))
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)

                Text(tr("events.detail.share.description", "Un enlace privado para que tu cliente vea el evento, el estado de pagos y los detalles clave."))
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
            Text(tr("events.detail.share.loading", "Cargando…"))
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
                Text(tr("events.detail.share.no_expiration", "Este enlace no tiene vencimiento. Podés deshabilitarlo cuando quieras."))
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
                    Text(copied ? tr("events.detail.share.copied", "Copiado") : tr("events.detail.share.copy", "Copiar enlace"))
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
                    subject: Text(tr("events.detail.share.subject", "Portal del cliente — Solennix")),
                    message: Text(trf("events.detail.share.message", "Hola! Acá podés ver los detalles de tu evento: %@", link.url))
                ) {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "square.and.arrow.up")
                        Text(tr("events.detail.share.share", "Compartir"))
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
                    Text(tr("events.detail.share.rotate", "Rotar enlace"))
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
                    Text(tr("events.detail.share.revoke_short", "Deshabilitar"))
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
            Text(trf("events.detail.share.expires", "Vence el %@", formatted))
                .font(.caption2)
        }
        .foregroundStyle(SolennixColors.textTertiary)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(tr("events.detail.share.empty", "Todavía no generaste un enlace para este evento."))
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            PremiumButton(
                title: tr("events.detail.share.generate", "Generar enlace para el cliente"),
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
        toastManager.show(message: tr("events.detail.share.success_copy", "Enlace copiado al portapapeles."), type: .success)
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
            toastManager.show(message: tr("events.detail.share.success_generate", "Enlace generado. Compartilo con tu cliente."), type: .success)
        }
    }

    @MainActor
    private func handleRotate() async {
        let ok = await viewModel.createOrRotate()
        if ok {
            toastManager.show(message: tr("events.detail.share.success_rotate", "Enlace rotado. El anterior ya no funciona."), type: .success)
        }
    }

    @MainActor
    private func handleRevoke() async {
        let ok = await viewModel.revoke()
        if ok {
            toastManager.show(message: tr("events.detail.share.success_revoke", "Enlace deshabilitado."), type: .info)
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

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    private func trf(_ key: String, _ value: String, _ arg: String) -> String {
        String(format: tr(key, value), locale: FeatureL10n.locale, arg)
    }
}

// MARK: - Preview

#Preview("Client Portal Share") {
    ClientPortalShareSheet(apiClient: APIClient(), eventId: "preview-event")
        .environment(ToastManager())
}
