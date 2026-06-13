import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Staff Form View

public struct StaffFormView: View {

    let staffId: String?

    @State private var viewModel: StaffFormViewModel
    @State private var showDiscardDialog: Bool = false
    @Environment(\.dismiss) private var dismiss

    public init(staffId: String? = nil, apiClient: APIClient) {
        self.staffId = staffId
        _viewModel = State(initialValue: StaffFormViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Form {
            infoSection
            contactSection
            notificationSection
            notesSection
        }
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
        .scrollDismissesKeyboard(.interactively)
        .keyboardDoneToolbar()
        .navigationTitle(staffId != nil ? StaffStrings.editTitle : StaffStrings.newTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button(StaffStrings.cancel) {
                    if viewModel.isDirty {
                        showDiscardDialog = true
                    } else {
                        dismiss()
                    }
                }
                .foregroundStyle(SolennixColors.textSecondary)
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task {
                        if let _ = await viewModel.validateAndSave() {
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
        .interactiveDismissDisabled(viewModel.isDirty && !viewModel.isSaving)
        .confirmationDialog(
            StaffStrings.discardChangesTitle,
            isPresented: $showDiscardDialog,
            titleVisibility: .visible
        ) {
            Button(StaffStrings.discardChangesConfirm, role: .destructive) {
                dismiss()
            }
            Button(StaffStrings.discardChangesCancel, role: .cancel) {}
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView(StaffStrings.loading)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(SolennixColors.background.opacity(0.6))
            }
        }
        .alert(StaffStrings.errorTitle, isPresented: .init(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button(StaffStrings.cancel, role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .sensoryFeedback(.success, trigger: viewModel.saveSuccessCounter)
        .sensoryFeedback(.error, trigger: viewModel.saveErrorCounter)
        .task {
            if let id = staffId {
                await viewModel.loadStaff(id: id)
            }
        }
    }

    // MARK: - Info Section

    private var infoSection: some View {
        Section(StaffStrings.sectionInfo) {
            AdaptiveFormRow {
                SolennixTextField(
                    label: StaffStrings.fieldName,
                    text: $viewModel.name,
                    placeholder: StaffStrings.fieldNamePlaceholder,
                    leftIcon: "person",
                    errorMessage: !viewModel.name.isEmpty && !viewModel.isNameValid
                        ? StaffStrings.nameMinError : nil,
                    textContentType: .name,
                    autocapitalization: .words
                )
            } right: {
                SolennixTextField(
                    label: StaffStrings.fieldRole,
                    text: $viewModel.roleLabel,
                    placeholder: StaffStrings.fieldRolePlaceholder,
                    leftIcon: "briefcase",
                    autocapitalization: .words
                )
            }
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }
    }

    // MARK: - Contact Section

    private var contactSection: some View {
        Section(StaffStrings.sectionContact) {
            AdaptiveFormRow {
                SolennixTextField(
                    label: StaffStrings.fieldPhone,
                    text: $viewModel.phone,
                    placeholder: StaffStrings.fieldPhonePlaceholder,
                    leftIcon: "phone",
                    textContentType: .telephoneNumber,
                    keyboardType: .phonePad
                )
            } right: {
                SolennixTextField(
                    label: StaffStrings.fieldEmail,
                    text: $viewModel.email,
                    placeholder: StaffStrings.fieldEmailPlaceholder,
                    leftIcon: "envelope",
                    errorMessage: !viewModel.email.isEmpty && !viewModel.isEmailValidIfProvided
                        ? StaffStrings.emailInvalidError : nil,
                    textContentType: .emailAddress,
                    keyboardType: .emailAddress,
                    autocapitalization: .never
                )
            }
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }
    }

    // MARK: - Notification Section

    private var notificationSection: some View {
        Section {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Toggle(isOn: $viewModel.notificationEmailOptIn) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(StaffStrings.notifToggleLabel)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(SolennixColors.text)

                        Text(StaffStrings.notifToggleSubtitle)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }
                .tint(SolennixColors.primary)

                if viewModel.notificationEmailOptIn && !viewModel.isOptInConsistent {
                    Text(StaffStrings.notifEmailRequired)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.error)
                }
            }
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        } header: {
            Text(StaffStrings.sectionNotif)
        }
    }

    // MARK: - Notes Section

    private var notesSection: some View {
        Section(StaffStrings.sectionNotes) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
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
}

// MARK: - Preview

#Preview("New Staff") {
    NavigationStack {
        StaffFormView(apiClient: APIClient())
    }
}

#Preview("Edit Staff") {
    NavigationStack {
        StaffFormView(staffId: "123", apiClient: APIClient())
    }
}
