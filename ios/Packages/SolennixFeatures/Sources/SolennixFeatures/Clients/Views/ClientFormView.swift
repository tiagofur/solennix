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
        .navigationTitle(clientId != nil ? "Editar Cliente" : "Nuevo Cliente")
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
                        Text("Guardar")
                            .fontWeight(.semibold)
                            .foregroundStyle(viewModel.isFormValid ? SolennixColors.primary : SolennixColors.textTertiary)
                    }
                }
                .disabled(!viewModel.isFormValid || viewModel.isSaving)
            }
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView("Cargando...")
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
        Section("Informacion") {
            AdaptiveFormRow {
                SolennixTextField(
                    label: "Nombre",
                    text: $viewModel.name,
                    placeholder: "Nombre del cliente",
                    leftIcon: "person",
                    errorMessage: !viewModel.name.isEmpty && !viewModel.isNameValid
                        ? "Minimo 2 caracteres" : nil,
                    textContentType: .name,
                    autocapitalization: .words
                )
            } right: {
                SolennixTextField(
                    label: "Telefono",
                    text: $viewModel.phone,
                    placeholder: "10 digitos",
                    leftIcon: "phone",
                    errorMessage: !viewModel.phone.isEmpty && !viewModel.isPhoneValid
                        ? "Minimo 10 digitos" : nil,
                    textContentType: .telephoneNumber,
                    keyboardType: .phonePad
                )
            }
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))

            AdaptiveFormRow {
                SolennixTextField(
                    label: "Email",
                    text: $viewModel.email,
                    placeholder: "correo@ejemplo.com",
                    leftIcon: "envelope",
                    textContentType: .emailAddress,
                    keyboardType: .emailAddress,
                    autocapitalization: .never
                )
            } right: {
                SolennixTextField(
                    label: "Ciudad",
                    text: $viewModel.city,
                    placeholder: "Ciudad",
                    leftIcon: "building.2",
                    textContentType: .addressCity
                )
            }
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }
    }

    // MARK: - Address Section

    private var addressSection: some View {
        Section("Direccion") {
            SolennixTextField(
                label: "Direccion",
                text: $viewModel.address,
                placeholder: "Calle y numero",
                leftIcon: "mappin.and.ellipse",
                textContentType: .fullStreetAddress
            )
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }
    }

    // MARK: - Notes Section

    private var notesSection: some View {
        Section("Notas") {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("Notas")
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
