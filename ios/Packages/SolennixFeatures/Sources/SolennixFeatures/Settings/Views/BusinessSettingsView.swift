import SwiftUI
import PhotosUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Business Settings View

public struct BusinessSettingsView: View {

    @State private var viewModel: BusinessSettingsViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var sizeClass

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: BusinessSettingsViewModel(apiClient: apiClient))
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    public var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView(tr("settings.loading", "Cargando..."))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                formContent
            }
        }
        .navigationTitle(tr("settings.action.business_settings", "Ajustes del negocio"))
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
                                    Text(viewModel.logoUrl != nil ? tr("settings.business.logo.change", "Cambiar logo") : tr("settings.business.logo.upload", "Subir logo"))
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
                Text(tr("settings.business.logo.title", "Logo"))
            } footer: {
                Text(tr("settings.business.logo.hint", "Tu logo aparecerá en los contratos y cotizaciones que generes."))
            }

            // Business name + Brand color section (2-col on iPad)
            Section {
                AdaptiveFormRow {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        TextField(tr("settings.business.name_label", "Nombre del negocio"), text: $viewModel.businessName)
                        Toggle(tr("settings.business.show_in_pdfs", "Mostrar en PDFs"), isOn: $viewModel.showBusinessNameInPdf)
                        Text(tr("settings.business.show_in_pdfs_hint", "Si activas esta opción, tu nombre comercial aparecerá en los documentos en lugar de tu nombre personal."))
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                } right: {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        ColorPicker(tr("settings.business.brand_color", "Color de marca"), selection: $viewModel.brandColor)
                        Text(tr("settings.business.brand_color_hint", "Este color se usará como acento en los documentos PDF que generes."))
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                }
            } header: {
                Text(tr("settings.business.identity_section", "Negocio e identidad visual"))
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
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
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
                Text(tr("common.save", "Guardar"))
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
