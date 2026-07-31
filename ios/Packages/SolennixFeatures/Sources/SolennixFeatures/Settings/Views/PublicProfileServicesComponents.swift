import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Services Section

/// Multi-select of services shown on the public page. Each toggle fires
/// `viewModel.toggleService(id:)` via the `start` wrapper (view-scoped task).
struct PublicProfileServicesSection: View {
    @Bindable var viewModel: PublicProfileSettingsViewModel
    let start: PublicProfileScopedStart

    var body: some View {
        Section {
            if viewModel.servicesLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .solennixRow()
            } else if viewModel.services.isEmpty {
                Text(FeatureL10n.text(
                    "settings.public_profile.services_empty",
                    "Todavía no hay productos activos. Creá productos en tu catálogo primero."
                ))
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .solennixRow()
            } else {
                ForEach(viewModel.services) { svc in
                    serviceRow(svc)
                }
            }

            if viewModel.isSavingServices {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .solennixRow()
            }

            if let servicesError = viewModel.servicesError {
                Text(servicesError)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.error)
                    .solennixRow()
            }
        } header: {
            Text(FeatureL10n.text("settings.public_profile.services_section", "Servicios en la página pública"))
        } footer: {
            Text(FeatureL10n.text(
                "settings.public_profile.services_hint",
                "Activá los servicios que querés mostrar. Precios e imágenes salen de tus productos."
            ))
        }
    }

    @ViewBuilder
    private func serviceRow(_ svc: PublicProfileServiceSelectionItem) -> some View {
        Toggle(isOn: Binding(
            get: { svc.showOnPublicProfile },
            set: { _ in
                start {
                    await viewModel.toggleService(id: svc.id)
                }
            }
        )) {
            VStack(alignment: .leading, spacing: 2) {
                Text(svc.name)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(SolennixColors.text)
                if !svc.category.isEmpty {
                    Text(svc.category)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
        }
        .disabled(viewModel.isSavingServices)
        .solennixRow()
    }
}
