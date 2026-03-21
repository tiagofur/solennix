import SwiftUI
import PhotosUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Business Settings View

public struct BusinessSettingsView: View {

    @State private var viewModel: BusinessSettingsViewModel
    @Environment(\.dismiss) private var dismiss

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: BusinessSettingsViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("Cargando...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                formContent
            }
        }
        .navigationTitle("Ajustes del Negocio")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                saveButton
            }
        }
        .onChange(of: viewModel.selectedPhoto) { _, newValue in
            if newValue != nil {
                Task { await viewModel.handleLogoSelection() }
            }
        }
        .task { await viewModel.loadUser() }
    }

    // MARK: - Form Content

    private var formContent: some View {
        Form {
            // Logo section
            Section {
                HStack {
                    Spacer()

                    VStack(spacing: Spacing.md) {
                        // Logo preview
                        if let logoUrl = viewModel.logoUrl, let url = APIClient.resolveURL(logoUrl) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFit()
                                        .frame(width: 100, height: 100)
                                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                                case .failure:
                                    logoPlaceholder
                                case .empty:
                                    ProgressView()
                                        .frame(width: 100, height: 100)
                                @unknown default:
                                    logoPlaceholder
                                }
                            }
                        } else {
                            logoPlaceholder
                        }

                        // Upload button
                        PhotosPicker(
                            selection: $viewModel.selectedPhoto,
                            matching: .images
                        ) {
                            HStack {
                                if viewModel.isUploadingLogo {
                                    ProgressView()
                                        .progressViewStyle(.circular)
                                } else {
                                    Image(systemName: "photo")
                                    Text(viewModel.logoUrl != nil ? "Cambiar Logo" : "Subir Logo")
                                }
                            }
                            .font(.subheadline)
                            .fontWeight(.medium)
                        }
                        .disabled(viewModel.isUploadingLogo)
                    }

                    Spacer()
                }
                .padding(.vertical, Spacing.md)
            } header: {
                Text("Logo")
            } footer: {
                Text("Tu logo aparecera en los contratos y cotizaciones que generes.")
            }

            // Business name section
            Section {
                TextField("Nombre del negocio", text: $viewModel.businessName)

                Toggle("Mostrar en PDFs", isOn: $viewModel.showBusinessNameInPdf)
            } header: {
                Text("Nombre del Negocio")
            } footer: {
                Text("Si activas esta opcion, tu nombre comercial aparecera en los documentos en lugar de tu nombre personal.")
            }

            // Brand color section
            Section {
                ColorPicker("Color de marca", selection: $viewModel.brandColor)
            } header: {
                Text("Identidad Visual")
            } footer: {
                Text("Este color se usara como acento en los documentos PDF que generes.")
            }

            // Error message
            if let error = viewModel.errorMessage {
                Section {
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.error)
                }
            }
        }
    }

    // MARK: - Logo Placeholder

    private var logoPlaceholder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .fill(SolennixColors.surface)
                .frame(width: 100, height: 100)

            Image(systemName: "building.2")
                .font(.system(size: 32))
                .foregroundStyle(SolennixColors.textTertiary)
        }
    }

    // MARK: - Save Button

    private var saveButton: some View {
        Button {
            Task {
                let success = await viewModel.saveBusinessSettings()
                if success {
                    dismiss()
                }
            }
        } label: {
            if viewModel.isSaving {
                ProgressView()
            } else {
                Text("Guardar")
                    .fontWeight(.semibold)
            }
        }
        .disabled(viewModel.isSaving)
    }
}

// MARK: - Preview

#Preview("Business Settings") {
    NavigationStack {
        BusinessSettingsView(apiClient: APIClient())
    }
}
