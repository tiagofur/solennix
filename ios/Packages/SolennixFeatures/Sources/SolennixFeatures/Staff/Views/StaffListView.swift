import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Staff List View

public struct StaffListView: View {

    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @State private var viewModel: StaffListViewModel
    @Environment(\.openURL) private var openURL
    @Environment(\.apiClient) private var apiClient
    @Environment(ToastManager.self) private var toastManager

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: StaffListViewModel(apiClient: apiClient))
    }

    public var body: some View {
        content
            .background(SolennixColors.surfaceGrouped)
            // Fix 7: sensory feedback when delete confirmation appears (true only)
            .sensoryFeedback(.warning, trigger: viewModel.showDeleteConfirm) { _, newValue in newValue }
            .navigationTitle(StaffStrings.title)
            .navigationBarTitleDisplayMode(.large)
            .solennixSearchable(text: $viewModel.searchText, prompt: StaffStrings.searchPrompt)
            // loadStaff resets currentPage internally; resetPagination would clear
            // the array and flash skeletons on every pull-to-refresh.
            .refreshable { await viewModel.loadStaff() }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    HStack(spacing: Spacing.sm) {
                        NavigationLink(value: Route.staffForm()) {
                            Image(systemName: "plus")
                                .font(.body)
                                .foregroundStyle(SolennixColors.primary)
                                .accessibilityLabel(StaffStrings.addAccessibility)
                        }

                        sortMenu
                    }
                }
            }
            .confirmationDialog(
                StaffStrings.deleteTitle,
                isPresented: $viewModel.showDeleteConfirm,
                presenting: viewModel.deleteTarget
            ) { item in
                Button(StaffStrings.deleteAction, role: .destructive) {
                    guard let removed = viewModel.softDeleteStaff(item) else { return }
                    HapticsHelper.play(.success)
                    toastManager.showUndo(
                        message: StaffStrings.deletedToast(item.name),
                        onUndo: {
                            viewModel.restoreStaff(removed.staff, at: removed.index)
                            HapticsHelper.play(.success)
                        },
                        onExpire: {
                            Task { await viewModel.confirmDeleteStaff(removed.staff) }
                        }
                    )
                }
                Button(StaffStrings.cancel, role: .cancel) {}
            } message: { item in
                Text(StaffStrings.deleteMessage(item.name))
            }
            .task {
                await viewModel.loadStaff()
            }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if sizeClass == .regular {
            staffGrid
        } else {
            staffListCompact
        }
    }

    // MARK: - Teams Link Row (shared — avoids duplication between grid and compact)

    private var teamsLinkRow: some View {
        NavigationLink(value: Route.staffTeamList) {
            HStack(spacing: Spacing.md) {
                ZStack {
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .fill(SolennixColors.primaryLight)
                        .frame(width: 36, height: 36)
                    Image(systemName: "person.3.fill")
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.primary)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(StaffStrings.teamsLinkTitle)
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)
                    Text(StaffStrings.teamsLinkSubtitle)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
                Spacer()
                // Fix 10: remove manual chevron.right from iPad path only;
                // the compact List handles disclosure automatically.
            }
        }
    }

    // MARK: - iPad Grid

    private var staffGrid: some View {
        ScrollView {
            teamsLinkRow
                .buttonStyle(.plain)
                .padding(Spacing.md)
                .solennixCard(radius: CornerRadius.lg, border: false)
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.sm)

            if viewModel.isLoading && viewModel.staff.isEmpty {
                ProgressView()
                    .controlSize(.large)
                    .tint(SolennixColors.primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.xxxl)
            } else if viewModel.filteredStaff.isEmpty && !viewModel.isLoading {
                if viewModel.searchText.isEmpty {
                    // Fix 4: iPad first-run CTA
                    ipadFirstRunEmptyState
                } else {
                    EmptyStateView(
                        icon: "magnifyingglass",
                        title: StaffStrings.filteredEmptyTitle,
                        message: StaffStrings.filteredEmptyMessage,
                        iconColor: SolennixColors.primary
                    )
                }
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 300))], spacing: Spacing.sm) {
                    ForEach(viewModel.paginatedStaff) { item in
                        ZStack {
                            staffRow(item)
                                .padding(Spacing.md)
                                .solennixCard(radius: CornerRadius.lg, border: false)
                            NavigationLink(value: Route.staffDetail(id: item.id)) {
                                EmptyView()
                            }
                            .opacity(0)
                            .accessibilityHidden(true)
                        }
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel(staffAccessibilityLabel(item))
                        .accessibilityAddTraits(.isButton)
                        .accessibilityAction(named: StaffStrings.deleteAction) {
                            viewModel.deleteTarget = item
                            viewModel.showDeleteConfirm = true
                        }
                        .contextMenu {
                            NavigationLink(value: Route.staffForm(id: item.id)) {
                                Label(StaffStrings.edit, systemImage: "pencil")
                            }
                            if let phone = item.phone, !phone.isEmpty {
                                Button {
                                    if let url = URL(string: "tel:\(phone)") { openURL(url) }
                                    HapticsHelper.play(.success)
                                } label: {
                                    Label(StaffStrings.callAction, systemImage: "phone")
                                }
                            }
                            if let email = item.email, !email.isEmpty {
                                Button {
                                    if let url = URL(string: "mailto:\(email)") { openURL(url) }
                                    HapticsHelper.play(.success)
                                } label: {
                                    Label(StaffStrings.emailAction, systemImage: "envelope")
                                }
                            }
                            Divider()
                            Button(role: .destructive) {
                                HapticsHelper.play(.warning)
                                viewModel.deleteTarget = item
                                viewModel.showDeleteConfirm = true
                            } label: {
                                Label(StaffStrings.deleteAction, systemImage: "trash")
                            }
                        }
                        .task {
                            if item == viewModel.paginatedStaff.last {
                                await viewModel.loadMore()
                            }
                        }
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.bottom, Spacing.xxl)

                // Fix 5: footer condition → isLoadingMore (not hasMorePages)
                if viewModel.isLoadingMore {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .padding(.vertical, Spacing.md)
                }
            }
        }
        .background(SolennixColors.surfaceGrouped)
    }

    // Fix 4: iPad first-run empty state with real NavigationLink CTA
    private var ipadFirstRunEmptyState: some View {
        VStack(spacing: 0) {
            EmptyStateView(
                icon: "person.3",
                title: StaffStrings.emptyTitle,
                message: StaffStrings.emptyMessage,
                iconColor: SolennixColors.primary
            )
            NavigationLink(value: Route.staffForm()) {
                Text(StaffStrings.emptyAction)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.primaryDark)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, 16)
                    .background(SolennixColors.primaryLight)
                    .clipShape(Capsule())
                    .adaptiveGlass(in: Capsule(), fallback: .material)
            }
            .padding(.bottom, Spacing.xxl)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - iPhone Compact List

    @ViewBuilder
    private var staffListCompact: some View {
        if let error = viewModel.errorMessage, viewModel.staff.isEmpty, !viewModel.isLoading {
            // Error state — outside List for proper centering
            EmptyStateView(
                icon: "wifi.exclamationmark",
                title: StaffStrings.errorLoadingTitle,
                message: error,
                actionTitle: StaffStrings.retry,
                iconColor: SolennixColors.primary
            ) {
                Task { await viewModel.loadStaff() }
            }
        } else if viewModel.isLoading && viewModel.staff.isEmpty {
            List {
                Section {
                    teamsLinkRow
                        .solennixRow()
                        .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                }

                Section {
                    // Fix 3: in-List skeleton rows — no standalone List swap
                    staffSkeletonRows
                }
            }
            .listStyle(.insetGrouped)
            .listSectionSpacing(.compact)
            .solennixListStyle()
        } else if viewModel.filteredStaff.isEmpty && !viewModel.isLoading {
            // Empty states — outside List for proper centering
            staffEmptyState
        } else {
            List {
                Section {
                    teamsLinkRow
                        .solennixRow()
                        .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                }

                Section {
                    // Fix 1: canonical ZStack + opacity-0 NavigationLink row chrome
                    ForEach(viewModel.paginatedStaff) { item in
                        staffRowContent(item)
                    }

                    // Fix 5: footer condition → isLoadingMore (not hasMorePages)
                    if viewModel.isLoadingMore {
                        HStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                    }
                }
            }
            .listStyle(.insetGrouped)
            .listSectionSpacing(.compact)
            .solennixListStyle()
        }
    }

    // MARK: - Empty State (first-run vs filtered)

    @ViewBuilder
    private var staffEmptyState: some View {
        if viewModel.searchText.isEmpty {
            staffFirstRunEmptyState
        } else {
            EmptyStateView(
                icon: "magnifyingglass",
                title: StaffStrings.filteredEmptyTitle,
                message: StaffStrings.filteredEmptyMessage,
                iconColor: SolennixColors.primary
            )
        }
    }

    // MARK: - First-Run Empty State (Fix 4) — outside List for proper centering

    private var staffFirstRunEmptyState: some View {
        VStack(spacing: 0) {
            EmptyStateView(
                icon: "person.3",
                title: StaffStrings.emptyTitle,
                message: StaffStrings.emptyMessage,
                iconColor: SolennixColors.primary
            )
            NavigationLink(value: Route.staffForm()) {
                Text(StaffStrings.emptyAction)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.primaryDark)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, 16)
                    .background(SolennixColors.primaryLight)
                    .clipShape(Capsule())
                    .adaptiveGlass(in: Capsule(), fallback: .material)
            }
            .padding(.bottom, Spacing.xxl)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Skeleton Rows (Fix 3)

    /// Per-row skeletons inside the same List — no full-screen List swap.
    @ViewBuilder
    private var staffSkeletonRows: some View {
        ForEach(0..<5, id: \.self) { _ in
            StaffSkeletonRow()
                .solennixRow()
                .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
        }
        .accessibilityHidden(true)
    }

    // MARK: - Staff Row Content (extracted to avoid type-checker timeout)

    @ViewBuilder
    private func staffRowContent(_ item: Staff) -> some View {
        ZStack {
            staffRow(item)
            NavigationLink(value: Route.staffDetail(id: item.id)) {
                EmptyView()
            }
            .opacity(0)
            .accessibilityHidden(true)
        }
        .solennixRow()
        .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(staffAccessibilityLabel(item))
        .accessibilityAddTraits(.isButton)
        .accessibilityAction(named: StaffStrings.deleteAction) {
            viewModel.deleteTarget = item
            viewModel.showDeleteConfirm = true
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button(role: .destructive) {
                HapticsHelper.play(.warning)
                viewModel.deleteTarget = item
                viewModel.showDeleteConfirm = true
            } label: {
                Label(StaffStrings.deleteAction, systemImage: "trash")
            }

            NavigationLink(value: Route.staffForm(id: item.id)) {
                Label(StaffStrings.edit, systemImage: "pencil")
            }
            .tint(SolennixColors.accent)
        }
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            if let email = item.email, !email.isEmpty,
               let url = URL(string: "mailto:\(email)") {
                Button {
                    HapticsHelper.play(.success)
                    openURL(url)
                } label: {
                    Label(StaffStrings.emailAction, systemImage: "envelope.fill")
                }
                .tint(.blue)
            }

            if let phone = item.phone, !phone.isEmpty,
               let url = URL(string: "tel:\(phone)") {
                Button {
                    HapticsHelper.play(.success)
                    openURL(url)
                } label: {
                    Label(StaffStrings.callAction, systemImage: "phone.fill")
                }
                .tint(.green)
            }
        }
        .contextMenu {
            NavigationLink(value: Route.staffForm(id: item.id)) {
                Label(StaffStrings.edit, systemImage: "pencil")
            }
            if let phone = item.phone, !phone.isEmpty {
                Button {
                    if let url = URL(string: "tel:\(phone)") { openURL(url) }
                    HapticsHelper.play(.success)
                } label: {
                    Label(StaffStrings.callAction, systemImage: "phone")
                }
            }
            if let email = item.email, !email.isEmpty {
                Button {
                    if let url = URL(string: "mailto:\(email)") { openURL(url) }
                    HapticsHelper.play(.success)
                } label: {
                    Label(StaffStrings.emailAction, systemImage: "envelope")
                }
            }
            Divider()
            Button(role: .destructive) {
                HapticsHelper.play(.warning)
                viewModel.deleteTarget = item
                viewModel.showDeleteConfirm = true
            } label: {
                Label(StaffStrings.deleteAction, systemImage: "trash")
            }
        }
        .task {
            if item == viewModel.paginatedStaff.last {
                await viewModel.loadMore()
            }
        }
    }

    // MARK: - Staff Row (Fix 8: Dynamic Type stacking)

    private func staffRow(_ item: Staff) -> some View {
        Group {
            if dynamicTypeSize >= .accessibility1 {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack(spacing: Spacing.md) {
                        Avatar(name: item.name, photoURL: nil, size: 40)
                        staffNameText(item)
                    }
                    HStack {
                        staffSubtitleStack(item)
                        Spacer()
                        // Bell stays visible in accessibility sizes
                        if item.notificationEmailOptIn {
                            bellIcon(item)
                        }
                    }
                }
                .padding(.vertical, Spacing.xs)
            } else {
                HStack(spacing: Spacing.md) {
                    Avatar(name: item.name, photoURL: nil, size: 40)

                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        staffNameText(item)
                        staffSubtitleStack(item)
                    }

                    Spacer()

                    // Fix 2: bell icon hidden from a11y tree; label comes from composed label
                    if item.notificationEmailOptIn {
                        bellIcon(item)
                    }
                }
                .padding(.vertical, Spacing.xs)
            }
        }
    }

    private func staffNameText(_ item: Staff) -> some View {
        Text(item.name)
            .font(.body)
            .fontWeight(.semibold)
            .foregroundStyle(SolennixColors.text)
    }

    @ViewBuilder
    private func staffSubtitleStack(_ item: Staff) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            if let role = item.roleLabel, !role.isEmpty {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "briefcase")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                    Text(role)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }

            HStack(spacing: Spacing.sm) {
                if let phone = item.phone, !phone.isEmpty {
                    Text(phone)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                if let email = item.email, !email.isEmpty {
                    Text(email)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                        .lineLimit(1)
                }
            }
        }
    }

    private func bellIcon(_ item: Staff) -> some View {
        Image(systemName: "bell.badge")
            .font(.caption)
            .foregroundStyle(SolennixColors.primary)
            // Fix 2: bell hidden from a11y tree; info is in the composed label
            .accessibilityHidden(true)
    }

    // MARK: - Accessibility (Fix 2)

    /// Composed ordered label: name, role, email-notifications if active.
    private func staffAccessibilityLabel(_ item: Staff) -> String {
        var parts = [item.name]
        if let role = item.roleLabel, !role.isEmpty { parts.append(role) }
        if item.notificationEmailOptIn { parts.append(StaffStrings.emailNotifTitle) }
        return parts.joined(separator: ", ")
    }

    // MARK: - Sort Menu

    private var sortMenu: some View {
        Menu {
            Picker(StaffStrings.sortTitle, selection: $viewModel.sortKey) {
                ForEach(StaffSortKey.allCases, id: \.self) { key in
                    Text(key.label).tag(key)
                }
            }

            Divider()

            Button {
                viewModel.sortAscending.toggle()
            } label: {
                Label(
                    viewModel.sortAscending ? StaffStrings.sortAscending : StaffStrings.sortDescending,
                    systemImage: viewModel.sortAscending ? "arrow.up" : "arrow.down"
                )
            }
        } label: {
            Image(systemName: "arrow.up.arrow.down")
                .font(.body)
                .foregroundStyle(SolennixColors.primary)
                .accessibilityLabel(StaffStrings.sortAccessibility)
        }
    }
}

// MARK: - Staff Skeleton Row (Fix 3)

/// Skeleton placeholder matching staffRow shape:
/// avatar circle stub + name bar + role bar + trailing bell stub.
struct StaffSkeletonRow: View {
    public init() {}

    public var body: some View {
        HStack(spacing: Spacing.md) {
            // Avatar circle stub
            Circle()
                .fill(SolennixColors.surfaceAlt)
                .frame(width: 40, height: 40)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                SkeletonLine(width: 140, height: 14)   // name — body
                SkeletonLine(width: 100, height: 10)   // role — caption
            }

            Spacer(minLength: Spacing.sm)

            // Trailing bell stub
            SkeletonLine(width: 16, height: 16)
        }
        .padding(.vertical, Spacing.xs)
    }
}

// MARK: - Preview

#Preview("Staff List") {
    NavigationStack {
        StaffListView(apiClient: APIClient())
    }
}
