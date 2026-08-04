import SwiftUI
import SolennixCore
import SolennixNetwork
import SolennixDesign

/// Organizer inbox for public quote requests (#1122).
public struct RequestsInboxView: View {

    @State private var viewModel: RequestsInboxViewModel
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    public init(apiClient: APIClient) {
        _viewModel = State(wrappedValue: RequestsInboxViewModel(apiClient: apiClient))
    }

    public var body: some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(SolennixColors.surfaceGrouped)
            .navigationTitle(RequestsStrings.title)
            .navigationBarTitleDisplayMode(.large)
            .task {
                await viewModel.refresh()
            }
            .refreshable {
                await viewModel.refresh()
            }
            .alert(RequestsStrings.errorTitle, isPresented: Binding(
                get: { viewModel.errorMessage != nil && viewModel.items.isEmpty },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )) {
                Button(RequestsStrings.errorOk) { viewModel.errorMessage = nil }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
    }

    @ViewBuilder
    private var content: some View {
        if let error = viewModel.errorMessage, viewModel.items.isEmpty, !viewModel.isLoading {
            ContentUnavailableView {
                Label(RequestsStrings.errorLoadingTitle, systemImage: "network")
            } description: {
                Text(error)
            } actions: {
                Button(RequestsStrings.actionRetry) {
                    Task { await viewModel.refresh() }
                }
            }
        } else if viewModel.isLoading && viewModel.items.isEmpty {
            List {
                Section {
                    ForEach(0..<6, id: \.self) { _ in
                        PublicRequestSkeletonRow()
                    }
                }
            }
            .listStyle(.insetGrouped)
            .solennixListStyle()
        } else if viewModel.items.isEmpty {
            ContentUnavailableView {
                Label(RequestsStrings.emptyTitle, systemImage: "tray")
            } description: {
                Text(RequestsStrings.emptyMessage)
            }
        } else {
            listContent
        }
    }

    private var listContent: some View {
        List {
            Section {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(RequestsStatusFilter.allCases) { filter in
                            filterChip(filter)
                        }
                    }
                    .padding(.vertical, 4)
                }
                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                .listRowBackground(Color.clear)
            }

            Section {
                ForEach(viewModel.items) { request in
                    NavigationLink(value: request.id) {
                        PublicRequestRow(request: request)
                    }
                    .solennixRow()
                    .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(a11yLabel(for: request))
                    .accessibilityAddTraits(.isButton)
                    .onAppear {
                        Task { await viewModel.loadMoreIfNeeded(current: request) }
                    }
                }

                if viewModel.isLoadingMore {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                }
            }
        }
        .listStyle(.insetGrouped)
        .solennixListStyle()
        .navigationDestination(for: String.self) { id in
            PublicRequestDetailView(viewModel: viewModel, requestId: id)
        }
    }

    private func filterChip(_ filter: RequestsStatusFilter) -> some View {
        let selected = viewModel.statusFilter == filter
        return Button {
            Task { await viewModel.applyFilter(filter) }
        } label: {
            Text(filter.label)
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .foregroundStyle(selected ? Color.white : SolennixColors.text)
                .background(
                    selected ? SolennixColors.primary : SolennixColors.surfaceAlt,
                    in: Capsule()
                )
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private func a11yLabel(for request: PublicRequest) -> String {
        var parts = [request.displayName]
        if let eventType = request.eventType { parts.append(eventType) }
        parts.append(RequestsStrings.statusLabel(request.status))
        if !request.isRead { parts.append(RequestsStrings.unreadBadgeA11y) }
        return parts.joined(separator: ", ")
    }
}
