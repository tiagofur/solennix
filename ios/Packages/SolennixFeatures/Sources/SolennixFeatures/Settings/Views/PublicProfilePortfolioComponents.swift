import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Portfolio Section (Pro+)

/// Lists existing portfolio items with thumbnails, exposes a manual add form
/// (title + photo URL + event date) while below the cap
/// (`PublicProfileSettingsViewModel.portfolioMax` = 6), and shows the max
/// message when full. Add/delete run through the view-scoped `start` wrapper.
struct PublicProfilePortfolioSection: View {
    @Bindable var viewModel: PublicProfileSettingsViewModel
    let start: PublicProfileScopedStart

    private var atMax: Bool {
        viewModel.portfolio.count >= PublicProfileSettingsViewModel.portfolioMax
    }

    var body: some View {
        Section {
            if !viewModel.isPaid {
                Text(FeatureL10n.text(
                    "settings.public_profile.portfolio_pro_hint",
                    "El portafolio está disponible en el plan Pro."
                ))
                .font(.caption)
                .foregroundStyle(SolennixColors.textTertiary)
                .solennixRow()
            } else if viewModel.portfolioLoading {
                ProgressView().frame(maxWidth: .infinity).solennixRow()
            } else if viewModel.portfolio.isEmpty {
                Text(FeatureL10n.text(
                    "settings.public_profile.portfolio_empty",
                    "Todavía no hay elementos en el portafolio."
                ))
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .solennixRow()
            } else {
                ForEach(viewModel.portfolio) { item in
                    PublicProfilePortfolioRow(item: item, onDelete: {
                        start { await viewModel.deletePortfolioItem(id: item.id) }
                    })
                    .solennixRow()
                }
            }
            if viewModel.isPaid, !atMax { addForm }
            if viewModel.isPaid, atMax {
                Text(FeatureL10n.text("settings.public_profile.portfolio_max", "Ya tenés 6 elementos en el portafolio."))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .solennixRow()
            }
            if let portfolioError = viewModel.portfolioError {
                Text(portfolioError)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.error)
                    .solennixRow()
            }
        } header: {
            HStack(spacing: Spacing.xs) {
                Text(FeatureL10n.text("settings.public_profile.portfolio", "Portafolio"))
                if !viewModel.isPaid {
                    Image(systemName: "lock.fill")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }
        } footer: {
            if viewModel.isPaid {
                Text(FeatureL10n.text(
                    "settings.public_profile.portfolio_description",
                    "Mostrá hasta 6 eventos en tu página pública (Pro)."
                ))
            }
        }
    }

    @ViewBuilder
    private var addForm: some View {
        TextField(FeatureL10n.text("settings.public_profile.portfolio_title", "Título"), text: $viewModel.newPortfolioTitle)
            .solennixRow()
        TextField(FeatureL10n.text("settings.public_profile.portfolio_photo_url", "URL de la foto"), text: $viewModel.newPortfolioPhotoUrl)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .keyboardType(.URL)
            .solennixRow()
        TextField(
            FeatureL10n.text("settings.public_profile.portfolio_event_date", "Fecha del evento (YYYY-MM-DD)"),
            text: $viewModel.newPortfolioEventDate
        )
        .textInputAutocapitalization(.never)
        .autocorrectionDisabled()
        .solennixRow()
        Button {
            start { await viewModel.addPortfolioItem() }
        } label: {
            HStack {
                Spacer()
                if viewModel.isAddingPortfolio {
                    ProgressView()
                } else {
                    Label(FeatureL10n.text("settings.public_profile.portfolio_add", "Agregar"), systemImage: "plus.circle.fill")
                        .font(.subheadline.weight(.semibold))
                }
                Spacer()
            }
        }
        .disabled(
            viewModel.isAddingPortfolio
                || viewModel.newPortfolioTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                || viewModel.newPortfolioPhotoUrl.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        )
        .solennixRow()
    }
}

// MARK: - Portfolio Row

private struct PublicProfilePortfolioRow: View {
    let item: OrganizerPublicPortfolioItem
    let onDelete: () -> Void

    var body: some View {
        HStack(spacing: Spacing.sm) {
            PublicProfilePortfolioThumbnail(item: item)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.title)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(SolennixColors.text)
                    .lineLimit(1)
                if let date = item.eventDate, !date.isEmpty {
                    Text(date)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            Spacer()
            Button(role: .destructive, action: onDelete) {
                Image(systemName: "trash").foregroundStyle(SolennixColors.error)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel(FeatureL10n.text("common.delete", "Eliminar"))
        }
        .padding(.vertical, Spacing.xs)
    }
}

// MARK: - Portfolio Thumbnail

/// Prefers `thumbnailUrl`, falls back to `photoUrl`, and resolves via
/// `APIClient.resolveURL` (relative paths from the API -> absolute CDN URL).
private struct PublicProfilePortfolioThumbnail: View {
    let item: OrganizerPublicPortfolioItem

    private var url: URL? {
        let raw = item.thumbnailUrl ?? item.photoUrl
        return APIClient.resolveURL(raw) ?? URL(string: raw)
    }

    var body: some View {
        AsyncImage(url: url) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFill()
            case .empty:
                ProgressView()
            default:
                ZStack {
                    SolennixColors.surface
                    Image(systemName: "photo").foregroundStyle(SolennixColors.textTertiary)
                }
            }
        }
        .frame(width: 48, height: 48)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
        .overlay(RoundedRectangle(cornerRadius: CornerRadius.sm).stroke(SolennixColors.border, lineWidth: 1))
    }
}
