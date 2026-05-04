import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Staff Team Form View

public struct StaffTeamFormView: View {

    let teamId: String?

    @State private var viewModel: StaffTeamFormViewModel
    @State private var showMemberPicker: Bool = false
    @Environment(\.dismiss) private var dismiss

    public init(teamId: String? = nil, apiClient: APIClient) {
        self.teamId = teamId
        _viewModel = State(initialValue: StaffTeamFormViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Form {
            infoSection
            notesSection
            membersSection
        }
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(teamId != nil ? StaffStrings.teamEditTitle : StaffStrings.teamNewTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task {
                        if await viewModel.save() != nil {
                            dismiss()
                        }
                    }
                } label: {
                    if viewModel.isSaving {
                        ProgressView()
                    } else {
                        Text(StaffStrings.save)
                            .fontWeight(.semibold)
                            .foregroundStyle(viewModel.isFormValid ? SolennixColors.primary : SolennixColors.textTertiary)
                    }
                }
                .disabled(!viewModel.isFormValid || viewModel.isSaving)
            }
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView(StaffStrings.loading)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(SolennixColors.background.opacity(0.6))
            }
        }
        .alert("Error", isPresented: .init(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .sheet(isPresented: $showMemberPicker) {
            memberPickerSheet
        }
        .task {
            await viewModel.loadCatalog()
            if let id = teamId {
                await viewModel.loadTeam(id: id)
            }
        }
    }

    // MARK: - Info

    private var infoSection: some View {
        Section(StaffStrings.sectionInfo) {
            SolennixTextField(
                label: StaffStrings.fieldName,
                text: $viewModel.name,
                placeholder: StaffStrings.teamNamePlaceholder,
                leftIcon: "person.3",
                errorMessage: !viewModel.name.isEmpty && !viewModel.isNameValid
                    ? StaffStrings.teamNameError : nil,
                autocapitalization: .sentences
            )
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))

            SolennixTextField(
                label: StaffStrings.teamRoleLabel,
                text: $viewModel.roleLabel,
                placeholder: StaffStrings.teamRolePlaceholder,
                leftIcon: "briefcase",
                autocapitalization: .words
            )
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }
    }

    // MARK: - Notes

    private var notesSection: some View {
        Section(StaffStrings.sectionNotes) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(StaffStrings.teamNotesLabel)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)

                TextEditor(text: $viewModel.notes)
                    .frame(minHeight: 80)
                    .font(.body)
                    .foregroundStyle(SolennixColors.text)
                    .scrollContentBackground(.hidden)
                    .padding(Spacing.sm)
                    .background(SolennixColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(SolennixColors.border, lineWidth: 1)
                    )
            }
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }
    }

    // MARK: - Members

    private var membersSection: some View {
        Section {
            ForEach(viewModel.members) { member in
                memberRow(member)
            }
            .onMove { source, destination in
                viewModel.moveMember(from: source, to: destination)
            }
            .onDelete { offsets in
                viewModel.removeMember(at: offsets)
            }

            Button {
                showMemberPicker = true
            } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "person.crop.circle.badge.plus")
                        .foregroundStyle(SolennixColors.primary)
                    Text(StaffStrings.addMember)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.primary)
                    Spacer()
                }
            }
            .buttonStyle(.plain)
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        } header: {
            HStack {
                Text(StaffStrings.membersTitle)
                Spacer()
                if !viewModel.members.isEmpty {
                    EditButton()
                        .font(.caption)
                        .foregroundStyle(SolennixColors.primary)
                }
            }
        } footer: {
            Text(StaffStrings.membersFooter)
                .font(.caption)
                .foregroundStyle(SolennixColors.textTertiary)
        }
    }

    private func memberRow(_ member: StaffTeamMemberDraft) -> some View {
        HStack(spacing: Spacing.md) {
            Avatar(name: member.staffName, photoURL: nil, size: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(member.staffName)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)

                if let role = member.staffRoleLabel, !role.isEmpty {
                    Text(role)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }

            Spacer()

            Button {
                viewModel.toggleLead(for: member.staffId)
                HapticsHelper.play(.success)
            } label: {
                Image(systemName: member.isLead ? "crown.fill" : "crown")
                    .font(.body)
                    .foregroundStyle(member.isLead ? SolennixColors.primary : SolennixColors.textTertiary)
                    .accessibilityLabel(member.isLead ? StaffStrings.removeLead : StaffStrings.setLead)
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, Spacing.xs)
    }

    // MARK: - Member Picker Sheet

    private var memberPickerSheet: some View {
        NavigationStack {
            Group {
                if viewModel.staffCatalog.isEmpty {
                    EmptyStateView(
                        icon: "person.3",
                        title: StaffStrings.emptyTitle,
                        message: StaffStrings.pickerEmptyMessage
                    )
                } else {
                    MemberPickerList(
                        catalog: viewModel.staffCatalog,
                        alreadySelected: Set(viewModel.members.map { $0.staffId }),
                        onSelect: { staff in
                            viewModel.addMember(staff)
                            showMemberPicker = false
                        }
                    )
                }
            }
            .navigationTitle(StaffStrings.pickerTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(StaffStrings.close) { showMemberPicker = false }
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
        }
    }
}

// MARK: - Member Picker List (sub-view con su propio search)

private struct MemberPickerList: View {

    let catalog: [Staff]
    let alreadySelected: Set<String>
    let onSelect: (Staff) -> Void

    @State private var search: String = ""

    var body: some View {
        List {
            ForEach(filtered) { item in
                Button {
                    onSelect(item)
                } label: {
                    HStack(spacing: Spacing.sm) {
                        Avatar(name: item.name, photoURL: nil, size: 32)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.name)
                                .font(.body)
                                .foregroundStyle(SolennixColors.text)
                            if let role = item.roleLabel, !role.isEmpty {
                                Text(role)
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textSecondary)
                            }
                        }

                        Spacer()

                        if alreadySelected.contains(item.id) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(SolennixColors.success)
                        }
                    }
                }
                .buttonStyle(.plain)
                .disabled(alreadySelected.contains(item.id))
            }
        }
        .searchable(text: $search, prompt: StaffStrings.searchPrompt)
    }

    private var filtered: [Staff] {
        let query = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return catalog }
        return catalog.filter { s in
            s.name.lowercased().contains(query)
            || (s.roleLabel?.lowercased().contains(query) ?? false)
        }
    }
}

// MARK: - Preview

#Preview("New Team") {
    NavigationStack {
        StaffTeamFormView(apiClient: APIClient())
    }
}

#Preview("Edit Team") {
    NavigationStack {
        StaffTeamFormView(teamId: "team-1", apiClient: APIClient())
    }
}
