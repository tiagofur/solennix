import SwiftUI
import SolennixCore
import SolennixNetwork
import SolennixDesign

/// Provider (or visitor) preview of a public profile page (#1126).
public struct PublicProfilePreviewView: View {

    @State private var viewModel: PublicProfilePreviewViewModel
    private let slug: String

    public init(apiClient: APIClient, slug: String) {
        self.slug = slug
        _viewModel = State(wrappedValue: PublicProfilePreviewViewModel(apiClient: apiClient, slug: slug))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.profile == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.notFound {
                ContentUnavailableView {
                    Label(
                        FeatureL10n.text("public_profile.preview.not_found_title", "Perfil no disponible"),
                        systemImage: "person.crop.circle.badge.exclamationmark"
                    )
                } description: {
                    Text(
                        FeatureL10n.text(
                            "public_profile.preview.not_found_message",
                            "Este perfil no existe o no esta publicado."
                        )
                    )
                }
            } else if let error = viewModel.errorMessage, viewModel.profile == nil {
                ContentUnavailableView {
                    Label(
                        FeatureL10n.text("public_profile.preview.error_title", "Error al cargar"),
                        systemImage: "wifi.exclamationmark"
                    )
                } description: {
                    Text(error)
                } actions: {
                    Button(FeatureL10n.text("public_profile.preview.retry", "Reintentar")) {
                        Task { await viewModel.load() }
                    }
                }
            } else if let profile = viewModel.profile {
                profileContent(profile)
            } else {
                ProgressView()
            }
        }
        .navigationTitle(
            viewModel.profile?.displayName
                ?? FeatureL10n.text("public_profile.preview.title", "Perfil publico")
        )
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let profile = viewModel.profile {
                ToolbarItem(placement: .primaryAction) {
                    if let url = URL(string: profile.publicURL) {
                        ShareLink(item: url) {
                            Image(systemName: "square.and.arrow.up")
                        }
                        .accessibilityLabel(
                            FeatureL10n.text("public_profile.preview.share", "Compartir")
                        )
                    }
                }
            }
        }
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
    }

    @ViewBuilder
    private func profileContent(_ profile: PublicOrganizerProfile) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                hero(profile)
                if let headline = profile.headline, !headline.isEmpty {
                    Text(headline)
                        .font(.title3.weight(.semibold))
                        .padding(.horizontal)
                }
                statsRow(profile)
                if let about = profile.about, !about.isEmpty {
                    section(
                        FeatureL10n.text("public_profile.preview.about", "Sobre el negocio"),
                        content: about
                    )
                }
                if let areas = profile.serviceAreas, !areas.isEmpty {
                    chipsSection(
                        FeatureL10n.text("public_profile.preview.areas", "Zonas"),
                        items: areas
                    )
                }
                if let types = profile.eventTypes, !types.isEmpty {
                    chipsSection(
                        FeatureL10n.text("public_profile.preview.events", "Eventos"),
                        items: types
                    )
                }
                if let services = profile.services, !services.isEmpty {
                    servicesSection(services, showPrices: services.contains { $0.basePrice != nil })
                }
                if let packages = profile.packages, !packages.isEmpty {
                    packagesSection(packages)
                }
                if let portfolio = profile.portfolio, !portfolio.isEmpty {
                    portfolioSection(portfolio)
                }
                if let reviews = profile.reviews, !reviews.isEmpty {
                    reviewsSection(reviews, average: profile.averageRating, count: profile.reviewsCount)
                }
                if let contact = profile.contact {
                    contactSection(contact)
                }
                if let socials = profile.socials, !socials.isEmpty {
                    chipsSection(
                        FeatureL10n.text("public_profile.preview.socials", "Redes"),
                        items: socials.map { "\($0.key): \($0.value)" }
                    )
                }
                if let loc = profile.location?.formatted, !loc.isEmpty {
                    section(
                        FeatureL10n.text("public_profile.preview.location", "Ubicacion"),
                        content: loc
                    )
                }
                Text(profile.publicURL)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
                    .padding(.horizontal)
                    .padding(.bottom, 32)
            }
        }
        .background(SolennixColors.surfaceGrouped)
    }

    private func hero(_ profile: PublicOrganizerProfile) -> some View {
        ZStack(alignment: .bottomLeading) {
            Group {
                if let cover = profile.coverUrl, let url = APIClient.resolveURL(cover) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFill()
                        default:
                            Rectangle().fill(brandColor(profile).opacity(0.25))
                        }
                    }
                } else {
                    Rectangle().fill(brandColor(profile).opacity(0.25))
                }
            }
            .frame(height: 180)
            .clipped()

            HStack(spacing: 12) {
                if let logo = profile.logoUrl, let url = APIClient.resolveURL(logo) {
                    AsyncImage(url: url) { phase in
                        if case .success(let image) = phase {
                            image.resizable().scaledToFill()
                        } else {
                            Color.white.opacity(0.3)
                        }
                    }
                    .frame(width: 64, height: 64)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white, lineWidth: 2))
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(profile.displayName)
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                        .shadow(radius: 2)
                    if let rating = profile.averageRating, let count = profile.reviewsCount {
                        Text(String(format: "★ %.1f · %d", rating, count))
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.white.opacity(0.95))
                    }
                }
            }
            .padding(16)
        }
    }

    private func statsRow(_ profile: PublicOrganizerProfile) -> some View {
        HStack(spacing: 16) {
            if let completed = profile.eventsCompleted {
                stat(
                    FeatureL10n.text("public_profile.preview.completed", "Eventos"),
                    "\(completed)"
                )
            }
            if let response = profile.responseTime, !response.isEmpty {
                stat(
                    FeatureL10n.text("public_profile.preview.response", "Respuesta"),
                    response
                )
            }
            if let minG = profile.minGuests, let maxG = profile.maxGuests {
                stat(
                    FeatureL10n.text("public_profile.preview.capacity", "Capacidad"),
                    "\(minG)-\(maxG)"
                )
            }
        }
        .padding(.horizontal)
    }

    private func stat(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value).font(.headline)
            Text(label).font(.caption).foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(SolennixColors.surfaceAlt, in: RoundedRectangle(cornerRadius: 12))
    }

    private func section(_ title: String, content: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.headline).padding(.horizontal)
            Text(content)
                .font(.body)
                .foregroundStyle(SolennixColors.textSecondary)
                .padding(.horizontal)
        }
    }

    private func chipsSection(_ title: String, items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.headline).padding(.horizontal)
            FlowChips(items: items)
                .padding(.horizontal)
        }
    }

    private func servicesSection(_ services: [PublicProfileService], showPrices: Bool) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(FeatureL10n.text("public_profile.preview.services", "Servicios"))
                .font(.headline)
                .padding(.horizontal)
            ForEach(services) { service in
                HStack {
                    Text(service.name)
                    if service.isFeatured == true {
                        Image(systemName: "star.fill")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.primary)
                    }
                    Spacer()
                    if showPrices, let price = service.basePrice {
                        Text(String(format: "%.0f", price))
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 4)
            }
        }
    }

    private func packagesSection(_ packages: [PublicPackage]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(FeatureL10n.text("public_profile.preview.packages", "Paquetes"))
                .font(.headline)
                .padding(.horizontal)
            ForEach(packages) { pkg in
                VStack(alignment: .leading, spacing: 4) {
                    Text(pkg.title).font(.subheadline.weight(.semibold))
                    if let desc = pkg.description, !desc.isEmpty {
                        Text(desc).font(.caption).foregroundStyle(SolennixColors.textSecondary)
                    }
                    if let from = pkg.fromPrice {
                        Text(String(format: "Desde %.0f", from))
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(SolennixColors.primary)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 6)
            }
        }
    }

    private func portfolioSection(_ items: [PublicPortfolioItem]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(FeatureL10n.text("public_profile.preview.portfolio", "Portafolio"))
                .font(.headline)
                .padding(.horizontal)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(items) { item in
                        VStack(alignment: .leading, spacing: 4) {
                            if let url = APIClient.resolveURL(item.thumbnailUrl ?? item.photoUrl) {
                                AsyncImage(url: url) { phase in
                                    if case .success(let image) = phase {
                                        image.resizable().scaledToFill()
                                    } else {
                                        Color.gray.opacity(0.2)
                                    }
                                }
                                .frame(width: 140, height: 100)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                            Text(item.title)
                                .font(.caption)
                                .lineLimit(1)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    private func reviewsSection(_ reviews: [PublicReview], average: Double?, count: Int?) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(FeatureL10n.text("public_profile.preview.reviews", "Resenas"))
                    .font(.headline)
                if let average, let count {
                    Text(String(format: "★ %.1f (%d)", average, count))
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            .padding(.horizontal)
            ForEach(reviews.prefix(5)) { review in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(review.displayName).font(.subheadline.weight(.semibold))
                        Spacer()
                        Text(String(repeating: "★", count: max(0, min(5, review.rating))))
                            .font(.caption)
                            .foregroundStyle(SolennixColors.primary)
                    }
                    if let comment = review.comment, !comment.isEmpty {
                        Text(comment).font(.caption).foregroundStyle(SolennixColors.textSecondary)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 4)
            }
        }
    }

    private func contactSection(_ contact: PublicContact) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(FeatureL10n.text("public_profile.preview.contact", "Contacto"))
                .font(.headline)
                .padding(.horizontal)
            Text("\(contact.type): \(contact.value)")
                .font(.body)
                .padding(.horizontal)
        }
    }

    private func brandColor(_ profile: PublicOrganizerProfile) -> Color {
        if let hex = profile.brandColor, !hex.isEmpty {
            return Color(hex: hex)
        }
        return SolennixColors.primary
    }
}

// MARK: - Simple chip wrap

private struct FlowChips: View {
    let items: [String]

    var body: some View {
        // Horizontal scroll is enough for preview; full flow layout deferred.
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(items, id: \.self) { item in
                    Text(item)
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(SolennixColors.surfaceAlt, in: Capsule())
                }
            }
        }
    }
}
