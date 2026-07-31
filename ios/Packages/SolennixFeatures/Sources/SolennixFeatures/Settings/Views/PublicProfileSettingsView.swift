import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Public Profile Settings View

/// Settings screen for the organizer public professional profile.
/// Visual style matches `EditProfileView` / `BusinessSettingsView`
/// (Form + `.solennixListStyle()` + `.solennixRow()` + design tokens).
///
/// Sections are decomposed into sibling `PublicProfile*Components.swift` files
/// following the `EventDetailView` + `*Components.swift` convention.
public struct PublicProfileSettingsView: View {

    @State private var viewModel: PublicProfileSettingsViewModel
    @State private var scoped: ViewScopedTask?
    @State private var showPricingSheet = false
    @Environment(\.dismiss) private var dismiss
    @Environment(AuthManager.self) private var authManager
    @Environment(\.apiClient) private var apiClient

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: PublicProfileSettingsViewModel(apiClient: apiClient))
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    /// Wraps a fire-and-forget operation so it is view-scoped (cancelled on
    /// disappear) instead of a bare `Task`. Sub-components receive this as
    /// their `start` closure.
    private var scopedStart: PublicProfileScopedStart {
        { [scoped] op in scoped?.start(op) }
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
        .navigationTitle(
            tr("settings.public_profile.title", "Perfil público profesional")
        )
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                SolennixSaveButton(
                    title: tr("common.save", "Guardar"),
                    action: {
                        scoped?.start {
                            _ = await viewModel.save()
                        }
                    },
                    isValid: viewModel.slugError == nil,
                    isSaving: viewModel.isSaving
                )
            }
        }
        .sheet(isPresented: $showPricingSheet) {
            PricingView(apiClient: apiClient, authManager: authManager)
        }
        .task {
            await viewModel.load()
        }
        .viewScopedTask(scoped: $scoped)
    }

    // MARK: - Form

    private var formContent: some View {
        Form {
            PublicProfileIntroSection(viewModel: viewModel)
            PublicProfileSlugSection(viewModel: viewModel)
            PublicProfileHeadlineSection(viewModel: viewModel)
            PublicProfileLocationSection(viewModel: viewModel)
            PublicProfileContactSection(viewModel: viewModel)

            PublicProfileVisibilitySection(viewModel: viewModel) {
                showPricingSheet = true
            }

            if !viewModel.isPaid {
                PublicProfileProUpsellSection {
                    showPricingSheet = true
                }
            }

            PublicProfileSocialsSection(viewModel: viewModel)
            PublicProfileAboutSection(viewModel: viewModel)
            PublicProfileServicesSection(viewModel: viewModel, start: scopedStart)
            PublicProfilePackagesSection(viewModel: viewModel, start: scopedStart)
            PublicProfileFaqSection(viewModel: viewModel, start: scopedStart)
            PublicProfilePortfolioSection(viewModel: viewModel, start: scopedStart)

            if let error = viewModel.errorMessage {
                Section {
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.error)
                        .solennixRow()
                }
            }
        }
        .solennixListStyle()
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        PublicProfileSettingsView(apiClient: APIClient())
    }
}
