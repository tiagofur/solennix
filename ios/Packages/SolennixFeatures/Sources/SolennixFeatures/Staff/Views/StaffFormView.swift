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
        .solennixListStyle()
        .scrollDismissesKeyboard(.interactively)
        .keyboardDoneToolbar()
        .navigationTitle(staffId != nil ? StaffStrings.editTitle : StaffStrings.newTitle)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                SolennixCancelButton(title: StaffStrings.cancel) {
                    if viewModel.isDirty {
                        showDiscardDialog = true
                    } else {
                        dismiss()
                    }
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                SolennixSaveButton(
                    title: StaffStrings.save,
                    action: {
                        Task {
                            if let _ = await viewModel.validateAndSave() {
                                dismiss()
                            }
                        }
                    },
                    isValid: viewModel.isFormValid,
                    isSaving: viewModel.isSaving
                )
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
        Section {
            TextField(StaffStrings.fieldName, text: $viewModel.name,
                      prompt: Text(StaffStrings.fieldNamePlaceholder))
                .textContentType(.name)
                .textInputAutocapitalization(.words)
                .solennixRow()

            if !viewModel.name.isEmpty && !viewModel.isNameValid {
                Text(StaffStrings.nameMinError)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.error)
                    .solennixRow()
            }

            TextField(StaffStrings.fieldRole, text: $viewModel.roleLabel,
                      prompt: Text(StaffStrings.fieldRolePlaceholder))
                .textInputAutocapitalization(.words)
                .solennixRow()
        } header: {
            Text(StaffStrings.sectionInfo)
        }
    }

    // MARK: - Contact Section

    private var contactSection: some View {
        Section {
            TextField(StaffStrings.fieldPhone, text: $viewModel.phone,
                      prompt: Text(StaffStrings.fieldPhonePlaceholder))
                .textContentType(.telephoneNumber)
                .keyboardType(.phonePad)
                .solennixRow()

            TextField(StaffStrings.fieldEmail, text: $viewModel.email,
                      prompt: Text(StaffStrings.fieldEmailPlaceholder))
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .solennixRow()

            if !viewModel.email.isEmpty && !viewModel.isEmailValidIfProvided {
                Text(StaffStrings.emailInvalidError)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.error)
                    .solennixRow()
            }
        } header: {
            Text(StaffStrings.sectionContact)
        }
    }

    // MARK: - Notification Section

    private var notificationSection: some View {
        Section {
            Toggle(isOn: $viewModel.notificationEmailOptIn) {
                Text(StaffStrings.notifToggleLabel)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .tint(SolennixColors.primary)
            .solennixRow()

            if viewModel.notificationEmailOptIn && !viewModel.isOptInConsistent {
                Text(StaffStrings.notifEmailRequired)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.error)
                    .solennixRow()
            }
        } header: {
            Text(StaffStrings.sectionNotif)
        }
    }

    // MARK: - Notes Section

    private var notesSection: some View {
        Section {
            TextEditor(text: $viewModel.notes)
                .frame(minHeight: 80)
                .font(.body)
                .foregroundStyle(SolennixColors.text)
                .scrollContentBackground(.hidden)
                .solennixRow()
        } header: {
            Text(StaffStrings.sectionNotes)
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
