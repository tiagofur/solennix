import SwiftUI
import PhotosUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Client Form View

public struct ClientFormView: View {

    let clientId: String?

    @State private var viewModel: ClientFormViewModel
    @State private var selectedItem: PhotosPickerItem?
    @Environment(\.dismiss) private var dismiss
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
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(clientId != nil
            ? String(localized: "clients.form.edit_title", defaultValue: "Editar cliente", bundle: .module)
            : String(localized: "clients.form.new_title", defaultValue: "Nuevo cliente", bundle: .module))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
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
                        Text(String(localized: "clients.action.save", defaultValue: "Guardar", bundle: .module))
                            .fontWeight(.semibold)
                            .foregroundStyle(viewModel.isFormValid ? SolennixColors.primary : SolennixColors.textTertiary)
                    }
                }
                .disabled(!viewModel.isFormValid || viewModel.isSaving)
            }
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView(String(localized: "clients.loading", defaultValue: "Cargando...", bundle: .module))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(SolennixColors.background.opacity(0.6))
            }
        }
        .alert(String(localized: "clients.error.title", defaultValue: "Error", bundle: .module), isPresented: .init(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button(String(localized: "clients.action.ok", defaultValue: "OK", bundle: .module), role: .cancel) {}
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
        .task {
            if let id = clientId {
                await viewModel.loadClient(id: id)
            }
        }
        .onChange(of: selectedItem) { _, newItem in
            Task {
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
                            .foregroundStyle(.white)
                            .frame(width: 28, height: 28)
                            .background(SolennixColors.primary)
                            .clipShape(Circle())
                            .offset(x: 2, y: 2)
                    }
                }

                Spacer()
            }
            .listRowBackground(Color.clear)
        }
    }

    // MARK: - Info Section

    private var infoSection: some View {
        Section(String(localized: "clients.form.info_section", defaultValue: "Información", bundle: .module)) {
            AdaptiveFormRow {
                SolennixTextField(
                    label: String(localized: "clients.form.name", defaultValue: "Nombre", bundle: .module),
                    text: $viewModel.name,
                    placeholder: String(localized: "clients.form.name_placeholder", defaultValue: "Nombre del cliente", bundle: .module),
                    leftIcon: "person",
                    errorMessage: !viewModel.name.isEmpty && !viewModel.isNameValid
                        ? String(localized: "clients.form.validation.name_min", defaultValue: "Mínimo 2 caracteres", bundle: .module) : nil,
                    textContentType: .name,
                    autocapitalization: .words
                )
            } right: {
                SolennixTextField(
                    label: String(localized: "clients.form.phone", defaultValue: "Teléfono", bundle: .module),
                    text: $viewModel.phone,
                    placeholder: String(localized: "clients.form.phone_placeholder", defaultValue: "10 dígitos", bundle: .module),
                    leftIcon: "phone",
                    errorMessage: !viewModel.phone.isEmpty && !viewModel.isPhoneValid
                        ? String(localized: "clients.form.validation.phone_min", defaultValue: "Mínimo 10 dígitos", bundle: .module) : nil,
                    textContentType: .telephoneNumber,
                    keyboardType: .phonePad
                )
            }
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))

            AdaptiveFormRow {
                SolennixTextField(
                    label: String(localized: "clients.form.email", defaultValue: "Email", bundle: .module),
                    text: $viewModel.email,
                    placeholder: String(localized: "clients.form.email_placeholder", defaultValue: "correo@ejemplo.com", bundle: .module),
                    leftIcon: "envelope",
                    textContentType: .emailAddress,
                    keyboardType: .emailAddress,
                    autocapitalization: .never
                )
            } right: {
                SolennixTextField(
                    label: String(localized: "clients.form.city", defaultValue: "Ciudad", bundle: .module),
                    text: $viewModel.city,
                    placeholder: String(localized: "clients.form.city", defaultValue: "Ciudad", bundle: .module),
                    leftIcon: "building.2",
                    textContentType: .addressCity
                )
            }
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }
    }

    // MARK: - Address Section

    private var addressSection: some View {
        Section(String(localized: "clients.form.address_section", defaultValue: "Dirección", bundle: .module)) {
            SolennixTextField(
                label: String(localized: "clients.form.address", defaultValue: "Dirección", bundle: .module),
                text: $viewModel.address,
                placeholder: String(localized: "clients.form.address_placeholder", defaultValue: "Calle y número", bundle: .module),
                leftIcon: "mappin.and.ellipse",
                textContentType: .fullStreetAddress
            )
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }
    }

    // MARK: - Notes Section

    private var notesSection: some View {
        Section(String(localized: "clients.form.notes_section", defaultValue: "Notas", bundle: .module)) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(String(localized: "clients.form.notes", defaultValue: "Notas", bundle: .module))
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
