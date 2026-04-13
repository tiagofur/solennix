import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Form Links View

public struct EventFormLinksView: View {

    @State private var viewModel: EventFormLinksViewModel
    @State private var showGenerateSheet: Bool = false
    @State private var showDeleteConfirm: Bool = false
    @State private var deleteTarget: EventFormLink?
    @Environment(ToastManager.self) private var toastManager

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: EventFormLinksViewModel(apiClient: apiClient))
    }

    public var body: some View {
        VStack(spacing: 0) {
            content
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Links de Formulario")
        .navigationBarTitleDisplayMode(.large)
        .refreshable { await viewModel.loadLinks() }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showGenerateSheet = true
                } label: {
                    Image(systemName: "plus.circle")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)
                        .accessibilityLabel("Generar link")
                }
            }
        }
        .sheet(isPresented: $showGenerateSheet) {
            GenerateLinkSheet(viewModel: viewModel, isPresented: $showGenerateSheet)
        }
        .confirmationDialog(
            "Eliminar link",
            isPresented: $showDeleteConfirm,
            presenting: deleteTarget
        ) { link in
            Button("Eliminar", role: .destructive) {
                HapticsHelper.play(.success)
                Task { await viewModel.deleteLink(id: link.id) }
                toastManager.show(message: "Link eliminado", type: .success)
            }
            Button("Cancelar", role: .cancel) {}
        } message: { link in
            Text("Se eliminara el link \"\(link.label ?? "sin etiqueta")\". Esta accion no se puede deshacer.")
        }
        .task {
            await viewModel.loadLinks()
        }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if let error = viewModel.errorMessage, viewModel.links.isEmpty, !viewModel.isLoading {
            EmptyStateView(
                icon: "wifi.exclamationmark",
                title: "Error al cargar",
                message: error,
                actionTitle: "Reintentar"
            ) {
                Task { await viewModel.loadLinks() }
            }
        } else if viewModel.isLoading && viewModel.links.isEmpty {
            skeletonList
        } else if viewModel.links.isEmpty && !viewModel.isLoading {
            EmptyStateView(
                icon: "link.badge.plus",
                title: "Sin links",
                message: "Genera un link para que tus clientes llenen su informacion de evento",
                actionTitle: "Generar Link"
            ) {
                showGenerateSheet = true
            }
        } else {
            linkList
        }
    }

    // MARK: - Link List

    private var linkList: some View {
        List {
            ForEach(viewModel.links) { link in
                linkRow(link)
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        Button(role: .destructive) {
                            HapticsHelper.play(.warning)
                            deleteTarget = link
                            showDeleteConfirm = true
                        } label: {
                            Label("Eliminar", systemImage: "trash")
                        }
                    }
                    .swipeActions(edge: .leading, allowsFullSwipe: true) {
                        Button {
                            copyLink(link)
                        } label: {
                            Label("Copiar", systemImage: "doc.on.doc")
                        }
                        .tint(SolennixColors.info)

                        ShareLink(item: link.url) {
                            Label("Compartir", systemImage: "square.and.arrow.up")
                        }
                        .tint(SolennixColors.primary)
                    }
                    .contextMenu {
                        Button {
                            copyLink(link)
                        } label: {
                            Label("Copiar Link", systemImage: "doc.on.doc")
                        }

                        ShareLink(item: link.url) {
                            Label("Compartir", systemImage: "square.and.arrow.up")
                        }

                        if viewModel.effectiveStatus(for: link) == "used",
                           let eventId = link.submittedEventId {
                            NavigationLink(value: Route.eventDetail(id: eventId)) {
                                Label("Ver Evento", systemImage: "calendar")
                            }
                        }

                        Divider()

                        Button(role: .destructive) {
                            HapticsHelper.play(.warning)
                            deleteTarget = link
                            showDeleteConfirm = true
                        } label: {
                            Label("Eliminar", systemImage: "trash")
                        }
                    }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
    }

    // MARK: - Link Row

    private func linkRow(_ link: EventFormLink) -> some View {
        HStack(spacing: Spacing.md) {
            statusIndicator(for: link)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack(spacing: Spacing.sm) {
                    Text(link.label ?? "Sin etiqueta")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.text)
                        .lineLimit(1)

                    linkStatusBadge(for: link)
                }

                Text(formattedDate(link.createdAt))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)

                if viewModel.effectiveStatus(for: link) == "active" {
                    Text("Expira: \(formattedDate(link.expiresAt))")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }

                if viewModel.effectiveStatus(for: link) == "used" {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.success)
                        Text("Formulario completado")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.success)
                    }
                }
            }

            Spacer()

            // Quick share button
            if viewModel.effectiveStatus(for: link) == "active" {
                ShareLink(item: link.url) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)
                }
                .buttonStyle(.plain)
            } else if viewModel.effectiveStatus(for: link) == "used",
                      let eventId = link.submittedEventId {
                NavigationLink(value: Route.eventDetail(id: eventId)) {
                    Image(systemName: "arrow.right.circle")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, Spacing.xs)
    }

    // MARK: - Status Indicator

    private func statusIndicator(for link: EventFormLink) -> some View {
        let status = viewModel.effectiveStatus(for: link)

        return ZStack {
            Circle()
                .fill(statusBackgroundColor(status))
                .frame(width: 36, height: 36)

            Image(systemName: statusIcon(status))
                .font(.caption)
                .foregroundStyle(statusForegroundColor(status))
        }
    }

    private func linkStatusBadge(for link: EventFormLink) -> some View {
        let display = viewModel.displayStatus(for: link)
        let status = viewModel.effectiveStatus(for: link)

        return Text(display)
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundStyle(statusForegroundColor(status))
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xxs)
            .background(statusBackgroundColor(status))
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
    }

    // MARK: - Status Colors & Icons

    private func statusForegroundColor(_ status: String) -> Color {
        switch status {
        case "active": return SolennixColors.success
        case "used": return SolennixColors.info
        case "expired": return SolennixColors.textTertiary
        default: return SolennixColors.textSecondary
        }
    }

    private func statusBackgroundColor(_ status: String) -> Color {
        switch status {
        case "active": return SolennixColors.successBg
        case "used": return SolennixColors.infoBg
        case "expired": return SolennixColors.surfaceAlt
        default: return SolennixColors.surfaceAlt
        }
    }

    private func statusIcon(_ status: String) -> String {
        switch status {
        case "active": return "link"
        case "used": return "checkmark.circle.fill"
        case "expired": return "clock.badge.xmark"
        default: return "questionmark.circle"
        }
    }

    // MARK: - Helpers

    private func copyLink(_ link: EventFormLink) {
        UIPasteboard.general.string = link.url
        HapticsHelper.play(.success)
        toastManager.show(message: "Link copiado", type: .success)
    }

    private func formattedDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) {
            return date.formatted(.dateTime.day().month(.abbreviated).year().hour().minute())
        }
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: isoString) {
            return date.formatted(.dateTime.day().month(.abbreviated).year().hour().minute())
        }
        return isoString
    }

    // MARK: - Skeleton Loading

    private var skeletonList: some View {
        List(0..<4, id: \.self) { _ in
            HStack(spacing: Spacing.md) {
                Circle()
                    .fill(SolennixColors.surfaceAlt)
                    .frame(width: 36, height: 36)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    RoundedRectangle(cornerRadius: CornerRadius.sm)
                        .fill(SolennixColors.surfaceAlt)
                        .frame(width: 140, height: 14)

                    RoundedRectangle(cornerRadius: CornerRadius.sm)
                        .fill(SolennixColors.surfaceAlt)
                        .frame(width: 100, height: 10)
                }

                Spacer()
            }
            .padding(.vertical, Spacing.xs)
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
        .redacted(reason: .placeholder)
    }
}

// MARK: - Generate Link Sheet

private struct GenerateLinkSheet: View {

    let viewModel: EventFormLinksViewModel
    @Binding var isPresented: Bool
    @State private var label: String = ""
    @State private var ttlDays: Int = 7

    private let ttlOptions = [1, 3, 7, 14, 30]

    var body: some View {
        NavigationStack {
            Form {
                Section("Etiqueta (opcional)") {
                    TextField("Ej: Boda Rodriguez, Evento Mayo", text: $label)
                }

                Section("Vigencia del link") {
                    Picker("Dias de vigencia", selection: $ttlDays) {
                        ForEach(ttlOptions, id: \.self) { days in
                            Text(days == 1 ? "1 dia" : "\(days) dias").tag(days)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section {
                    Text("El cliente podra llenar sus datos de evento a traves de este link. Una vez usado, no podra volver a utilizarse.")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            .scrollContentBackground(.hidden)
            .background(SolennixColors.surfaceGrouped)
            .navigationTitle("Generar Link")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") {
                        isPresented = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Generar") {
                        Task {
                            await viewModel.generateLink(
                                label: label.isEmpty ? nil : label,
                                ttlDays: ttlDays
                            )
                            isPresented = false
                        }
                    }
                    .fontWeight(.semibold)
                    .disabled(viewModel.isGenerating)
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Preview

#Preview("Event Form Links") {
    NavigationStack {
        EventFormLinksView(apiClient: APIClient())
    }
}
