import SwiftUI
import PhotosUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Client Form View

public struct ClientFormView: View {

    let clientId: String?

    @State private var viewModel: ClientFormViewModel
    @State private var scoped: ViewScopedTask?
    @State private var selectedItem: PhotosPickerItem?
    @State private var showDiscardDialog: Bool = false
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(PlanLimitsManager.self) private var planLimitsManager

    public init(clientId: String? = nil, apiClient: APIClient) {
        self.clientId = clientId
        _viewModel = State(initialValue: ClientFormViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Form {
            photoSection
            infoSection
            addressSection
            notesSection
        }
        .solennixListStyle()
        .scrollDismissesKeyboard(.interactively)
        .keyboardDoneToolbar()
        .navigationTitle(clientId != nil
            ? tr("clients.form.edit_title", "Editar cliente")
            : tr("clients.form.new_title", "Nuevo cliente"))
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                SolennixCancelButton(title: tr("clients.action.cancel", "Cancelar")) {
                    if viewModel.isDirty {
                        showDiscardDialog = true
                    } else {
                        dismiss()
                    }
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                SolennixSaveButton(
                    title: tr("clients.action.save", "Guardar"),
                    action: {
                        scoped?.start {
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
            tr("common.discard_changes.title", "¿Descartar cambios?"),
            isPresented: $showDiscardDialog,
            titleVisibility: .visible
        ) {
            Button(tr("common.discard_changes.confirm", "Descartar"), role: .destructive) {
                dismiss()
            }
            Button(tr("common.discard_changes.cancel", "Cancelar"), role: .cancel) {}
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView(tr("clients.loading", "Cargando..."))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(SolennixColors.background.opacity(0.6))
            }
        }
        .alert(tr("clients.error.title", "Error"), isPresented: .init(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button(tr("clients.action.ok", "OK"), role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .sheet(isPresented: .init(
            get: { viewModel.planLimitMessage != nil },
            set: { if !$0 { viewModel.planLimitMessage = nil } }
        )) {
            PaywallSheet(
                message: viewModel.planLimitMessage ?? "",
                onUpgrade: {
                    viewModel.planLimitMessage = nil
                    dismiss()
                },
                onDismiss: {
                    viewModel.planLimitMessage = nil
                }
            )
        }
        .sensoryFeedback(.success, trigger: viewModel.saveSuccessCounter)
        .sensoryFeedback(.error, trigger: viewModel.saveErrorCounter)
        .task {
            if let id = clientId {
                await viewModel.loadClient(id: id)
            }
        }
        .viewScopedTask(scoped: $scoped)
        .onChange(of: selectedItem) { _, newItem in
            scoped?.start {
                if let data = try? await newItem?.loadTransferable(type: Data.self) {
                    viewModel.selectedPhotoData = data
                }
            }
        }
    }

    // MARK: - Photo Section

    private var photoSection: some View {
        Section {
            HStack {
                Spacer()

                PhotosPicker(selection: $selectedItem, matching: .images) {
                    ZStack(alignment: .bottomTrailing) {
                        if let photoData = viewModel.selectedPhotoData,
                           let uiImage = UIImage(data: photoData) {
                            Image(uiImage: uiImage)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 80, height: 80)
                                .clipShape(Circle())
                        } else {
                            Avatar(
                                name: viewModel.name.isEmpty ? "?" : viewModel.name,
                                photoURL: viewModel.photoURL,
                                size: 80
                            )
                        }

                        Image(systemName: "camera.fill")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textInverse)
                            .frame(width: 28, height: 28)
                            .background(SolennixColors.primary)
                            .clipShape(Circle())
                            .offset(x: 2, y: 2)
                    }
                }

                Spacer()
            }
            .padding(.vertical, Spacing.sm)
            .solennixRow()
            .listRowSeparator(.hidden)
        }
    }

    // MARK: - Info Section

    private var infoSection: some View {
        Section {
            TextField(tr("clients.form.name", "Nombre"), text: $viewModel.name,
                      prompt: Text(tr("clients.form.name_placeholder", "Nombre del cliente")))
                .textContentType(.name)
                .textInputAutocapitalization(.words)
                .solennixRow()

            if !viewModel.name.isEmpty && !viewModel.isNameValid {
                Text(tr("clients.form.validation.name_min", "Mínimo 2 caracteres"))
                    .font(.caption)
                    .foregroundStyle(.red)
                    .solennixRow()
            }

            TextField(tr("clients.form.phone", "Teléfono"), text: $viewModel.phone,
                      prompt: Text(tr("clients.form.phone_placeholder", "10 dígitos")))
                .textContentType(.telephoneNumber)
                .keyboardType(.phonePad)
                .solennixRow()

            if !viewModel.phone.isEmpty && !viewModel.isPhoneValid {
                Text(tr("clients.form.validation.phone_min", "Mínimo 10 dígitos"))
                    .font(.caption)
                    .foregroundStyle(.red)
                    .solennixRow()
            }

            TextField(tr("clients.form.email", "Email"), text: $viewModel.email,
                      prompt: Text(tr("clients.form.email_placeholder", "correo@ejemplo.com")))
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .solennixRow()

            TextField(tr("clients.form.city", "Ciudad"), text: $viewModel.city,
                      prompt: Text(tr("clients.form.city", "Ciudad")))
                .textContentType(.addressCity)
                .solennixRow()
        } header: {
            Text(tr("clients.form.info_section", "Información"))
        }
    }

    // MARK: - Address Section

    private var addressSection: some View {
        Section {
            TextField(tr("clients.form.address", "Dirección"), text: $viewModel.address,
                      prompt: Text(tr("clients.form.address_placeholder", "Calle y número")))
                .textContentType(.fullStreetAddress)
                .solennixRow()
        } header: {
            Text(tr("clients.form.address_section", "Dirección"))
        }
    }

    // MARK: - Notes Section

    private var notesSection: some View {
        Section {
            TextEditor(text: $viewModel.notes)
                .frame(minHeight: 80)
                .frame(maxHeight: dynamicTypeSize >= .accessibility1 ? 150 : nil)
                .scrollDisabled(false)
                .scrollContentBackground(.hidden)
                .solennixRow()
        } header: {
            Text(tr("clients.form.notes_section", "Notas"))
        }
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

}

// MARK: - Preview

#Preview("New Client") {
    NavigationStack {
        ClientFormView(apiClient: APIClient())
    }
}

#Preview("Edit Client") {
    NavigationStack {
        ClientFormView(clientId: "123", apiClient: APIClient())
    }
}
