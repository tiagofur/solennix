import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Packages Section (Pro+)

/// Lists existing packages, exposes an add form while below the cap
/// (`PublicProfileSettingsViewModel.packagesMax` = 6), and shows the max
/// message when full. Add/delete run through the view-scoped `start` wrapper.
struct PublicProfilePackagesSection: View {
    @Bindable var viewModel: PublicProfileSettingsViewModel
    let start: PublicProfileScopedStart

    private var atMax: Bool {
        viewModel.packages.count >= PublicProfileSettingsViewModel.packagesMax
    }

    var body: some View {
        Section {
            if !viewModel.isPaid {
                Text(FeatureL10n.text(
                    "settings.public_profile.packages_pro_hint",
                    "Los paquetes están disponibles en el plan Pro."
                ))
                .font(.caption)
                .foregroundStyle(SolennixColors.textTertiary)
                .solennixRow()
            } else if viewModel.packagesLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .solennixRow()
            } else if viewModel.packages.isEmpty {
                Text(FeatureL10n.text(
                    "settings.public_profile.packages_empty",
                    "Todavía no hay paquetes."
                ))
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .solennixRow()
            } else {
                ForEach(viewModel.packages) { pkg in
                    PublicProfilePackageRow(
                        pkg: pkg,
                        onDelete: {
                            start {
                                await viewModel.deletePackage(id: pkg.id)
                            }
                        }
                    )
                    .solennixRow()
                }
            }

            if viewModel.isPaid, !atMax {
                addForm
            }

            if viewModel.isPaid, atMax {
                Text(FeatureL10n.text("settings.public_profile.packages_max", "Ya tenés 6 paquetes."))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .solennixRow()
            }

            if let packagesError = viewModel.packagesError {
                Text(packagesError)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.error)
                    .solennixRow()
            }
        } header: {
            HStack(spacing: Spacing.xs) {
                Text(FeatureL10n.text("settings.public_profile.packages_section", "Paquetes"))
                if !viewModel.isPaid {
                    Image(systemName: "lock.fill")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }
        } footer: {
            if viewModel.isPaid {
                Text(FeatureL10n.text(
                    "settings.public_profile.packages_description",
                    "Mostrá hasta 6 paquetes o combos en tu página pública."
                ))
            }
        }
    }

    @ViewBuilder
    private var addForm: some View {
        TextField(
            FeatureL10n.text("settings.public_profile.package_title", "Título del paquete"),
            text: $viewModel.newPackageTitle
        )
        .solennixRow()

        TextField(
            FeatureL10n.text("settings.public_profile.package_description", "Descripción"),
            text: $viewModel.newPackageDescription,
            axis: .vertical
        )
        .lineLimit(2...4)
        .solennixRow()

        TextField(
            FeatureL10n.text("settings.public_profile.package_price", "Precio desde"),
            text: $viewModel.newPackagePrice
        )
        .keyboardType(.decimalPad)
        .solennixRow()

        TextField(
            FeatureL10n.text("settings.public_profile.package_inclusions", "Incluye (separado por coma)"),
            text: $viewModel.newPackageInclusions
        )
        .solennixRow()

        Button {
            start {
                await viewModel.addPackage()
            }
        } label: {
            HStack {
                Spacer()
                if viewModel.isAddingPackage {
                    ProgressView()
                } else {
                    Label(
                        FeatureL10n.text("settings.public_profile.package_add", "Agregar paquete"),
                        systemImage: "plus.circle.fill"
                    )
                    .font(.subheadline.weight(.semibold))
                }
                Spacer()
            }
        }
        .disabled(
            viewModel.isAddingPackage
                || viewModel.newPackageTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        )
        .solennixRow()
    }
}

// MARK: - Package Row

private struct PublicProfilePackageRow: View {
    let pkg: OrganizerPublicPackage
    let onDelete: () -> Void

    var body: some View {
        HStack(spacing: Spacing.sm) {
            VStack(alignment: .leading, spacing: 2) {
                Text(pkg.title)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(SolennixColors.text)
                    .lineLimit(1)
                if let price = pkg.fromPrice {
                    Text(price.formatted(.currency(code: "MXN")))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.primary)
                }
            }

            Spacer()

            Button(role: .destructive, action: onDelete) {
                Image(systemName: "trash")
                    .foregroundStyle(SolennixColors.error)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel(FeatureL10n.text("common.delete", "Eliminar"))
        }
        .padding(.vertical, Spacing.xs)
    }
}
