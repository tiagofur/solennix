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
    @State private var deleteSuccessCounter: Int = 0   // A4: counter for post-delete success haptic
    @Environment(ToastManager.self) private var toastManager

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: EventFormLinksViewModel(apiClient: apiClient))
    }

    public var body: some View {
        VStack(spacing: 0) {
            content
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(EventFormLinksStrings.title)
        .navigationBarTitleDisplayMode(.large)
        .refreshable { await viewModel.loadLinks() }
        // A4: warning haptic when delete confirmation appears
        .sensoryFeedback(.warning, trigger: showDeleteConfirm) { _, new in new }
        // A4: success haptic AFTER delete resolves (counter increments post-async)
        .sensoryFeedback(.success, trigger: deleteSuccessCounter) { old, new in new > old }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showGenerateSheet = true
                } label: {
                    Image(systemName: "plus.circle")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)
                        .accessibilityLabel(EventFormLinksStrings.generateLinkAccessibility)
                }
            }
        }
        .sheet(isPresented: $showGenerateSheet) {
            GenerateLinkSheet(viewModel: viewModel, isPresented: $showGenerateSheet)
        }
        .confirmationDialog(
            EventFormLinksStrings.deleteConfirmTitle,
            isPresented: $showDeleteConfirm,
            presenting: deleteTarget
        ) { link in
            Button(EventFormLinksStrings.deleteConfirmButton, role: .destructive) {
                // A4: warning here (dialog open), success fires AFTER async delete below
                Task {
                    await viewModel.deleteLink(id: link.id)
                    if let message = viewModel.errorMessage {
                        toastManager.show(message: message, type: .error)
                    } else {
                        toastManager.show(message: EventFormLinksStrings.linkDeletedToast, type: .success)
                        deleteSuccessCounter += 1   // A4: triggers .success sensoryFeedback
                    }
                }
            }
            Button(EventFormLinksStrings.cancel, role: .cancel) {}
        } message: { link in
            Text(EventFormLinksStrings.deleteConfirmMessage(label: link.label ?? EventFormLinksStrings.labelPlaceholder))
        }
        .task {
            await viewModel.loadLinks()
        }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if let error = viewModel.errorMessage, viewModel.links.isEmpty, !viewModel.isLoading {
            ContentUnavailableView {
                Label(EventFormLinksStrings.errorLoading, systemImage: "network")
            } description: {
                Text(error)
            } actions: {
                Button(EventFormLinksStrings.retry) {
                    Task { await viewModel.loadLinks() }
                }
            }
        } else if viewModel.links.isEmpty && !viewModel.isLoading {
            ContentUnavailableView {
                Label(EventFormLinksStrings.emptyTitle, systemImage: "link.badge.plus")
            } description: {
                Text(EventFormLinksStrings.emptyMessage)
            } actions: {
                Button(EventFormLinksStrings.emptyAction) {
                    showGenerateSheet = true
                }
            }
        } else {
            // B1 (A1): single List containing both skeleton rows and real rows
            linkList
        }
    }

    // MARK: - Link List (B1: merged skeleton into single List)

    private var linkList: some View {
        List {
            Section {
                if viewModel.isLoading && viewModel.links.isEmpty {
                    // B1: skeleton rows inside the same List — no standalone skeletonList
                    skeletonRows
                } else {
                    ForEach(viewModel.links) { link in
                        linkRow(link)
                            // A1: card chrome
                            .solennixRow()
                            .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                            // A1: composed a11y element
                            .accessibilityElement(children: .ignore)
                            .accessibilityLabel(accessibilityLabel(for: link))
                            .accessibilityAddTraits(.isButton)
                            .accessibilityAction(named: EventFormLinksStrings.swipeCopy) {
                                copyLink(link)
                            }
                            .accessibilityAction(named: EventFormLinksStrings.swipeDelete) {
                                deleteTarget = link
                                showDeleteConfirm = true
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button(role: .destructive) {
                                    HapticsHelper.play(.warning)
                                    deleteTarget = link
                                    showDeleteConfirm = true
                                } label: {
                                    Label(EventFormLinksStrings.swipeDelete, systemImage: "trash")
                                }
                            }
                            .swipeActions(edge: .leading, allowsFullSwipe: true) {
                                Button {
                                    copyLink(link)
                                } label: {
                                    Label(EventFormLinksStrings.swipeCopy, systemImage: "doc.on.doc")
                                }
                                .tint(SolennixColors.info)

                                ShareLink(item: link.url) {
                                    Label(EventFormLinksStrings.swipeShare, systemImage: "square.and.arrow.up")
                                }
                            }
                            .contextMenu {
                                Button {
                                    copyLink(link)
                                } label: {
                                    Label(EventFormLinksStrings.contextMenuCopy, systemImage: "doc.on.doc")
                                }

                                ShareLink(item: link.url) {
                                    Label(EventFormLinksStrings.swipeShare, systemImage: "square.and.arrow.up")
                                }

                                if viewModel.effectiveStatus(for: link) == "used",
                                   let eventId = link.submittedEventId {
                                    NavigationLink(value: Route.eventDetail(id: eventId)) {
                                        Label(EventFormLinksStrings.contextMenuViewEvent, systemImage: "calendar")
                                    }
                                }

                                Divider()

                                Button(role: .destructive) {
                                    HapticsHelper.play(.warning)
                                    deleteTarget = link
                                    showDeleteConfirm = true
                                } label: {
                                    Label(EventFormLinksStrings.swipeDelete, systemImage: "trash")
                                }
                            }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .solennixListStyle()
    }

    // MARK: - Skeleton Rows (B1: in-List, card chrome, a11y hidden)

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

    // MARK: - Link Row

    private func linkRow(_ link: EventFormLink) -> some View {
        HStack(spacing: Spacing.md) {
            // A1: decorative icon hidden from a11y
            statusIndicator(for: link)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack(spacing: Spacing.sm) {
                    Text(link.label ?? EventFormLinksStrings.labelPlaceholder)
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
                    Text(EventFormLinksStrings.expiresLabel(date: formattedDate(link.expiresAt)))
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }

                if viewModel.effectiveStatus(for: link) == "used" {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.success)
                            .accessibilityHidden(true)
                        Text(EventFormLinksStrings.completedForm)
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.success)
                    }
                }
            }

            Spacer()

            // A2: trailing action buttons with ≥44pt tap targets
            if viewModel.effectiveStatus(for: link) == "active" {
                ShareLink(item: link.url) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityHidden(true) // covered by swipe action + a11y action
            } else if viewModel.effectiveStatus(for: link) == "used",
                      let eventId = link.submittedEventId {
                NavigationLink(value: Route.eventDetail(id: eventId)) {
                    Image(systemName: "arrow.right.circle")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityHidden(true) // covered by a11y action above
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

    // MARK: - Accessibility (A1)

    /// Composed ordered label: label/title, status, expiry or used date.
    private func accessibilityLabel(for link: EventFormLink) -> String {
        let label = link.label ?? EventFormLinksStrings.labelPlaceholder
        let status = viewModel.displayStatus(for: link)
        let effective = viewModel.effectiveStatus(for: link)
        var parts = [label, status]
        if effective == "active" {
            parts.append(EventFormLinksStrings.expiresLabel(date: formattedDate(link.expiresAt)))
        } else if effective == "used" {
            parts.append(EventFormLinksStrings.completedForm)
        }
        return parts.joined(separator: ", ")
    }

    // MARK: - Helpers

    private func copyLink(_ link: EventFormLink) {
        UIPasteboard.general.string = link.url
        HapticsHelper.play(.success)
        toastManager.show(message: EventFormLinksStrings.linkCopiedToast, type: .success)
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

private struct GenerateLinkSheet: View {

    let viewModel: EventFormLinksViewModel
    @Binding var isPresented: Bool
    @State private var label: String = ""
    @State private var ttlDays: Int = 7

    private let ttlOptions = [1, 3, 7, 14, 30]

    var body: some View {
        NavigationStack {
            Form {
                Section(EventFormLinksStrings.sheetLabelSection) {
                    TextField(EventFormLinksStrings.sheetLabelPlaceholder, text: $label)
                        .solennixRow()
                }

                Section(EventFormLinksStrings.sheetTtlSection) {
                    Picker(EventFormLinksStrings.sheetTtlLabel, selection: $ttlDays) {
                        ForEach(ttlOptions, id: \.self) { days in
                            Text(EventFormLinksStrings.ttlDaysLabel(days)).tag(days)
                        }
                    }
                    .pickerStyle(.segmented)
                    .solennixRow()
                }

                Section {
                    Text(EventFormLinksStrings.sheetHint)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .solennixRow()
                }
            }
            .solennixListStyle()
            .navigationTitle(EventFormLinksStrings.sheetTitle)
            .navigationBarTitleDisplayMode(.inline)
            // A3: keyboard Done toolbar on the Form
            .keyboardDoneToolbar()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(EventFormLinksStrings.cancel) {
                        isPresented = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(EventFormLinksStrings.sheetGenerateButton) {
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
        .presentationDragIndicator(.visible)
    }
}

// MARK: - Preview

#Preview("Event Form Links") {
    NavigationStack {
        EventFormLinksView(apiClient: APIClient())
    }
}
