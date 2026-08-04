import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Request Links View (Compartir link)

/// Organizer share-link manager for Solicitudes (`/organizers/me/request-links`).
public struct RequestLinksView: View {

    @State private var viewModel: RequestLinksViewModel
    @State private var showGenerateSheet: Bool = false
    @State private var showDeleteConfirm: Bool = false
    @State private var deleteTarget: PublicRequestLink?
    @State private var deleteSuccessCounter: Int = 0
    @Environment(ToastManager.self) private var toastManager

    /// When embedded inside the Requests inbox tabs, hide large title chrome.
    private let embedded: Bool

    public init(apiClient: APIClient, embedded: Bool = false) {
        _viewModel = State(initialValue: RequestLinksViewModel(apiClient: apiClient))
        self.embedded = embedded
    }

    public init(viewModel: RequestLinksViewModel, embedded: Bool = false) {
        _viewModel = State(initialValue: viewModel)
        self.embedded = embedded
    }

    public var body: some View {
        VStack(spacing: 0) {
            content
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SolennixColors.surfaceGrouped)
        .if(!embedded) { view in
            view
                .navigationTitle(RequestsStrings.linksTitle)
                .navigationBarTitleDisplayMode(.large)
        }
        .refreshable { await viewModel.loadLinks() }
        .sensoryFeedback(.warning, trigger: showDeleteConfirm) { _, new in new }
        .sensoryFeedback(.success, trigger: deleteSuccessCounter) { old, new in new > old }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showGenerateSheet = true
                } label: {
                    Image(systemName: "plus.circle")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)
                        .accessibilityLabel(RequestsStrings.linkGenerateAccessibility)
                }
            }
        }
        .sheet(isPresented: $showGenerateSheet) {
            GenerateRequestLinkSheet(viewModel: viewModel, isPresented: $showGenerateSheet)
        }
        .confirmationDialog(
            RequestsStrings.linkDeleteConfirmTitle,
            isPresented: $showDeleteConfirm,
            presenting: deleteTarget
        ) { link in
            Button(RequestsStrings.linkDeleteConfirmButton, role: .destructive) {
                Task {
                    await viewModel.deleteLink(id: link.id)
                    if let message = viewModel.errorMessage {
                        toastManager.show(message: message, type: .error)
                    } else {
                        toastManager.show(message: RequestsStrings.linkDeletedToast, type: .success)
                        deleteSuccessCounter += 1
                    }
                }
            }
            Button(RequestsStrings.actionCancel, role: .cancel) {}
        } message: { link in
            Text(
                RequestsStrings.linkDeleteConfirmMessage(
                    label: link.label ?? RequestsStrings.linkLabelPlaceholder
                )
            )
        }
        .task {
            await viewModel.loadLinks()
        }
    }

    @ViewBuilder
    private var content: some View {
        if let error = viewModel.errorMessage, viewModel.links.isEmpty, !viewModel.isLoading {
            ContentUnavailableView {
                Label(RequestsStrings.linkErrorLoading, systemImage: "network")
            } description: {
                Text(error)
            } actions: {
                Button(RequestsStrings.actionRetry) {
                    Task { await viewModel.loadLinks() }
                }
            }
        } else if viewModel.links.isEmpty && !viewModel.isLoading {
            ContentUnavailableView {
                Label(RequestsStrings.linkEmptyTitle, systemImage: "link.badge.plus")
            } description: {
                Text(RequestsStrings.linkEmptyMessage)
            } actions: {
                Button(RequestsStrings.linkEmptyAction) {
                    showGenerateSheet = true
                }
            }
        } else {
            linkList
        }
    }

    private var linkList: some View {
        List {
            Section {
                if viewModel.isLoading && viewModel.links.isEmpty {
                    skeletonRows
                } else {
                    ForEach(viewModel.links) { link in
                        linkRow(link)
                            .solennixRow()
                            .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                            .accessibilityElement(children: .ignore)
                            .accessibilityLabel(accessibilityLabel(for: link))
                            .accessibilityAddTraits(.isButton)
                            .accessibilityAction(named: RequestsStrings.linkSwipeCopy) {
                                copyLink(link)
                            }
                            .accessibilityAction(named: RequestsStrings.linkSwipeDelete) {
                                deleteTarget = link
                                showDeleteConfirm = true
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button(role: .destructive) {
                                    HapticsHelper.play(.warning)
                                    deleteTarget = link
                                    showDeleteConfirm = true
                                } label: {
                                    Label(RequestsStrings.linkSwipeDelete, systemImage: "trash")
                                }
                            }
                            .swipeActions(edge: .leading, allowsFullSwipe: true) {
                                Button {
                                    copyLink(link)
                                } label: {
                                    Label(RequestsStrings.linkSwipeCopy, systemImage: "doc.on.doc")
                                }
                                .tint(SolennixColors.info)

                                ShareLink(item: link.shareURL) {
                                    Label(RequestsStrings.linkSwipeShare, systemImage: "square.and.arrow.up")
                                }
                            }
                            .contextMenu {
                                Button {
                                    copyLink(link)
                                } label: {
                                    Label(RequestsStrings.linkContextCopy, systemImage: "doc.on.doc")
                                }

                                ShareLink(item: link.shareURL) {
                                    Label(RequestsStrings.linkSwipeShare, systemImage: "square.and.arrow.up")
                                }

                                Divider()

                                Button(role: .destructive) {
                                    HapticsHelper.play(.warning)
                                    deleteTarget = link
                                    showDeleteConfirm = true
                                } label: {
                                    Label(RequestsStrings.linkSwipeDelete, systemImage: "trash")
                                }
                            }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .solennixListStyle()
    }

    @ViewBuilder
    private var skeletonRows: some View {
        ForEach(0..<4, id: \.self) { _ in
            HStack(spacing: Spacing.md) {
                Circle()
                    .fill(SolennixColors.surfaceAlt)
                    .frame(width: 36, height: 36)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    SkeletonLine(width: 140, height: 14)
                    SkeletonLine(width: 100, height: 10)
                }

                Spacer()
            }
            .padding(.vertical, Spacing.xs)
            .solennixRow()
            .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
        }
        .accessibilityHidden(true)
    }

    private func linkRow(_ link: PublicRequestLink) -> some View {
        HStack(spacing: Spacing.md) {
            statusIndicator(for: link)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack(spacing: Spacing.sm) {
                    Text(link.label ?? RequestsStrings.linkLabelPlaceholder)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.text)
                        .lineLimit(1)

                    linkStatusBadge(for: link)
                }

                Text(viewModel.displaySubmitMode(link.submitMode))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)

                Text(formattedDate(link.createdAt))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)

                if viewModel.effectiveStatus(for: link) == "active",
                   let expires = link.expiresAt, !expires.isEmpty {
                    Text(RequestsStrings.linkExpiresLabel(date: formattedDate(expires)))
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }

                if let max = link.maxUses {
                    Text(RequestsStrings.linkUsesLabel(used: link.useCount, max: max))
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }

            Spacer()

            if viewModel.effectiveStatus(for: link) == "active" {
                ShareLink(item: link.shareURL) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityHidden(true)
            }
        }
        .padding(.vertical, Spacing.xs)
    }

    private func statusIndicator(for link: PublicRequestLink) -> some View {
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

    private func linkStatusBadge(for link: PublicRequestLink) -> some View {
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

    private func statusForegroundColor(_ status: String) -> Color {
        switch status {
        case "active": return SolennixColors.success
        case "used": return SolennixColors.info
        case "expired", "revoked": return SolennixColors.textTertiary
        default: return SolennixColors.textSecondary
        }
    }

    private func statusBackgroundColor(_ status: String) -> Color {
        switch status {
        case "active": return SolennixColors.successBg
        case "used": return SolennixColors.infoBg
        default: return SolennixColors.surfaceAlt
        }
    }

    private func statusIcon(_ status: String) -> String {
        switch status {
        case "active": return "link"
        case "used": return "checkmark.circle.fill"
        case "expired": return "clock.badge.xmark"
        case "revoked": return "xmark.circle"
        default: return "questionmark.circle"
        }
    }

    private func accessibilityLabel(for link: PublicRequestLink) -> String {
        let label = link.label ?? RequestsStrings.linkLabelPlaceholder
        let status = viewModel.displayStatus(for: link)
        var parts = [label, status, viewModel.displaySubmitMode(link.submitMode)]
        if viewModel.effectiveStatus(for: link) == "active",
           let expires = link.expiresAt, !expires.isEmpty {
            parts.append(RequestsStrings.linkExpiresLabel(date: formattedDate(expires)))
        }
        return parts.joined(separator: ", ")
    }

    private func copyLink(_ link: PublicRequestLink) {
        UIPasteboard.general.string = link.shareURL
        HapticsHelper.play(.success)
        toastManager.show(message: RequestsStrings.linkCopiedToast, type: .success)
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
}

// MARK: - Generate Link Sheet

private struct GenerateRequestLinkSheet: View {

    let viewModel: RequestLinksViewModel
    @Binding var isPresented: Bool
    @State private var label: String = ""
    @State private var ttlDays: Int = 7
    @State private var maxUsesText: String = "1"
    @State private var submitMode: RequestLinkSubmitMode = .autoEvent

    private let ttlOptions = [1, 3, 7, 14, 30]

    var body: some View {
        NavigationStack {
            Form {
                Section(RequestsStrings.linkSheetLabelSection) {
                    TextField(RequestsStrings.linkSheetLabelPlaceholder, text: $label)
                        .solennixRow()
                }

                Section(RequestsStrings.linkSheetTtlSection) {
                    Picker(RequestsStrings.linkSheetTtlLabel, selection: $ttlDays) {
                        ForEach(ttlOptions, id: \.self) { days in
                            Text(RequestsStrings.linkTtlDaysLabel(days)).tag(days)
                        }
                    }
                    .pickerStyle(.segmented)
                    .solennixRow()
                }

                Section(RequestsStrings.linkSheetMaxUsesSection) {
                    TextField(RequestsStrings.linkSheetMaxUsesPlaceholder, text: $maxUsesText)
                        .keyboardType(.numberPad)
                        .solennixRow()
                    Text(RequestsStrings.linkSheetMaxUsesHint)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .solennixRow()
                }

                Section(RequestsStrings.linkSheetModeSection) {
                    Picker(RequestsStrings.linkSheetModeLabel, selection: $submitMode) {
                        Text(RequestsStrings.linkModeAutoEvent).tag(RequestLinkSubmitMode.autoEvent)
                        Text(RequestsStrings.linkModeAutoQuote).tag(RequestLinkSubmitMode.autoQuote)
                        Text(RequestsStrings.linkModeStandard).tag(RequestLinkSubmitMode.standard)
                    }
                    .solennixRow()
                }

                Section {
                    Text(RequestsStrings.linkSheetHint)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .solennixRow()
                }
            }
            .solennixListStyle()
            .navigationTitle(RequestsStrings.linkSheetTitle)
            .navigationBarTitleDisplayMode(.inline)
            .keyboardDoneToolbar()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(RequestsStrings.actionCancel) {
                        isPresented = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(RequestsStrings.linkSheetGenerateButton) {
                        Task {
                            let maxUses = maxUsesText.trimmingCharacters(in: .whitespaces)
                            let parsedMax = maxUses.isEmpty ? nil : Int(maxUses)
                            await viewModel.generateLink(
                                label: label.isEmpty ? nil : label,
                                ttlDays: ttlDays,
                                maxUses: parsedMax,
                                submitMode: submitMode
                            )
                            if viewModel.errorMessage == nil {
                                isPresented = false
                            }
                        }
                    }
                    .fontWeight(.semibold)
                    .disabled(viewModel.isGenerating)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

// MARK: - View helper

private extension View {
    @ViewBuilder
    func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }
}

#Preview("Request Links") {
    NavigationStack {
        RequestLinksView(apiClient: APIClient())
    }
}
