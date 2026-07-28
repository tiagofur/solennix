import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Response envelope

private struct DataEnvelope<T: Decodable>: Decodable {
    let data: T
}

// MARK: - Public Profile Settings ViewModel

@Observable
public final class PublicProfileSettingsViewModel {

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    // MARK: - Constants

    public static let portfolioMax = 6
    public static let freePublicProductMax = 3
    /// kebab-case, 3-140 chars (mirrors backend validatePublicSlug).
    public static let slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

    // MARK: - Form state

    public var isEnabled: Bool = false
    public var slug: String = ""
    public var headline: String = ""
    public var city: String = ""
    public var region: String = ""
    public var country: String = ""
    public var contactType: PublicContactType = .email
    public var contactValue: String = ""
    public var showPrices: Bool = false
    public var showServices: Bool = true
    public var showReviews: Bool = true
    public var showPortfolio: Bool = true
    public var showContact: Bool = true
    public var socialsText: String = ""

    // MARK: - Portfolio (Pro+)

    public var portfolio: [OrganizerPublicPortfolioItem] = []
    public var portfolioLoading: Bool = false
    public var portfolioError: String?
    public var newPortfolioTitle: String = ""
    public var newPortfolioPhotoUrl: String = ""
    public var newPortfolioEventDate: String = ""
    public var isAddingPortfolio: Bool = false

    // MARK: - UI state

    public var isLoading: Bool = false
    public var isSaving: Bool = false
    public var errorMessage: String?
    public var slugError: String?
    public var didCopyShareURL: Bool = false
    public var user: User?

    // MARK: - Derived

    public var isPaid: Bool {
        user?.plan.isPaid ?? false
    }

    public var shareURL: String? {
        let trimmed = slug.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        return SolennixURLs.publicProfileURL(slug: trimmed)
    }

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Load

    @MainActor
    public func load() async {
        isLoading = true
        errorMessage = nil
        slugError = nil

        do {
            // Plan + existing slug from /auth/me
            user = try await apiClient.get(Endpoint.me)

            let envelope: DataEnvelope<OrganizerPublicProfile> = try await apiClient.get(
                Endpoint.myPublicProfile
            )
            apply(profile: envelope.data)
        } catch {
            errorMessage = tr(
                "settings.public_profile.load_failed",
                "No se pudo cargar el perfil público."
            )
        }

        isLoading = false

        if isPaid {
            await loadPortfolio()
        } else {
            portfolio = []
        }
    }

    @MainActor
    public func loadPortfolio() async {
        guard isPaid else {
            portfolio = []
            return
        }
        portfolioLoading = true
        portfolioError = nil
        do {
            let items: [OrganizerPublicPortfolioItem] = try await apiClient.get(
                Endpoint.myPublicProfilePortfolio
            )
            portfolio = items.sorted { $0.sortOrder < $1.sortOrder }
        } catch {
            portfolioError = tr(
                "settings.public_profile.portfolio_load_failed",
                "No se pudo cargar el portafolio."
            )
        }
        portfolioLoading = false
    }

    // MARK: - Apply / Validate

    private func apply(profile: OrganizerPublicProfile) {
        isEnabled = profile.isEnabled
        slug = profile.publicSlug ?? user?.publicSlug ?? ""
        headline = profile.headline ?? ""
        city = profile.city ?? ""
        region = profile.region ?? ""
        country = profile.country ?? ""
        if let ct = profile.contactType {
            contactType = ct
        }
        contactValue = profile.contactValue ?? ""
        showPrices = profile.showPrices
        showServices = profile.showServices
        showContact = profile.showContact
        // Free: force Pro-only toggles off in UI.
        if isPaid {
            showReviews = profile.showReviews
            showPortfolio = profile.showPortfolio
            if let socials = profile.socials, !socials.isEmpty {
                socialsText = socials
                    .map { "\($0.key)=\($0.value)" }
                    .sorted()
                    .joined(separator: ",")
            } else {
                socialsText = ""
            }
        } else {
            showReviews = false
            showPortfolio = false
            socialsText = ""
        }
    }

    /// Returns a localized slug error, or `nil` if valid / empty.
    public func validateSlug(_ value: String) -> String? {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return nil }
        if trimmed.count < 3 || trimmed.count > 140 {
            return tr(
                "settings.public_profile.slug_length_error",
                "El slug debe tener entre 3 y 140 caracteres."
            )
        }
        if trimmed.wholeMatch(of: Self.slugRegex) == nil {
            return tr(
                "settings.public_profile.slug_format_error",
                "Solo minúsculas, números y guiones (sin guiones al inicio/final)."
            )
        }
        return nil
    }

    public func handleSlugChange(_ value: String) {
        slug = value
        slugError = validateSlug(value)
    }

    public static func parseSocials(_ text: String) -> [String: String] {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [:] }
        var out: [String: String] = [:]
        for pair in trimmed.split(separator: ",") {
            let parts = pair.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
            guard parts.count == 2 else { continue }
            let key = parts[0].trimmingCharacters(in: .whitespacesAndNewlines)
            let val = parts[1].trimmingCharacters(in: .whitespacesAndNewlines)
            if !key.isEmpty, !val.isEmpty {
                out[key] = val
            }
        }
        return out
    }

    // MARK: - Save

    @MainActor
    public func save() async -> Bool {
        errorMessage = nil
        let trimmedSlug = slug.trimmingCharacters(in: .whitespacesAndNewlines)

        // Enabling requires a shareable slug.
        if isEnabled, trimmedSlug.isEmpty {
            slugError = tr(
                "settings.public_profile.slug_required_on_enable",
                "Definí una dirección pública (slug) antes de activar el perfil."
            )
            return false
        }

        if let err = validateSlug(trimmedSlug) {
            slugError = err
            return false
        }

        isSaving = true
        defer { isSaving = false }

        let body = OrganizerPublicProfileUpsertRequest(
            isEnabled: isEnabled,
            publicSlug: trimmedSlug.isEmpty ? nil : trimmedSlug,
            headline: headline.isEmpty ? nil : headline,
            contactType: contactType.rawValue,
            contactValue: contactValue.isEmpty ? nil : contactValue,
            city: city.isEmpty ? nil : city,
            region: region.isEmpty ? nil : region,
            country: country.isEmpty ? nil : country,
            showPrices: showPrices,
            showServices: showServices,
            // Free: force Pro-only toggles off client-side (server also rejects).
            showReviews: isPaid ? showReviews : false,
            showPortfolio: isPaid ? showPortfolio : false,
            showContact: showContact,
            socials: isPaid ? Self.parseSocials(socialsText) : [:]
        )

        do {
            let envelope: DataEnvelope<OrganizerPublicProfile> = try await apiClient.put(
                Endpoint.myPublicProfile,
                body: body
            )
            apply(profile: envelope.data)
            if let savedSlug = envelope.data.publicSlug {
                slug = savedSlug
                user?.publicSlug = savedSlug
            }
            return true
        } catch let error as APIError {
            switch error {
            case .serverError(let code, _) where code == 409:
                errorMessage = tr(
                    "settings.public_profile.slug_taken",
                    "Esa dirección ya está en uso. Probá otra."
                )
            case .serverError(let code, _) where code == 403, .planLimitExceeded:
                errorMessage = tr(
                    "settings.public_profile.plan_required",
                    "Tu plan no incluye esta función. Considerá mejorar a Pro."
                )
            default:
                errorMessage = tr(
                    "settings.public_profile.save_failed",
                    "No se pudo guardar. Intentá de nuevo."
                )
            }
            return false
        } catch {
            errorMessage = tr(
                "settings.public_profile.save_failed",
                "No se pudo guardar. Intentá de nuevo."
            )
            return false
        }
    }

    // MARK: - Portfolio mutations

    @MainActor
    public func addPortfolioItem() async {
        portfolioError = nil
        let title = newPortfolioTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        let photo = newPortfolioPhotoUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty, !photo.isEmpty else {
            portfolioError = tr(
                "settings.public_profile.portfolio_save_failed",
                "No se pudo guardar el elemento."
            )
            return
        }
        guard portfolio.count < Self.portfolioMax else {
            portfolioError = tr(
                "settings.public_profile.portfolio_max",
                "Ya tenés 6 elementos en el portafolio."
            )
            return
        }

        isAddingPortfolio = true
        defer { isAddingPortfolio = false }

        let date = newPortfolioEventDate.trimmingCharacters(in: .whitespacesAndNewlines)
        let body = PortfolioCreateRequest(
            title: title,
            photoUrl: photo,
            eventDate: date.isEmpty ? nil : date,
            sortOrder: portfolio.count
        )

        do {
            let created: OrganizerPublicPortfolioItem = try await apiClient.post(
                Endpoint.myPublicProfilePortfolio,
                body: body
            )
            portfolio = (portfolio + [created]).sorted { $0.sortOrder < $1.sortOrder }
            newPortfolioTitle = ""
            newPortfolioPhotoUrl = ""
            newPortfolioEventDate = ""
        } catch {
            portfolioError = tr(
                "settings.public_profile.portfolio_save_failed",
                "No se pudo guardar el elemento."
            )
        }
    }

    @MainActor
    public func deletePortfolioItem(id: String) async {
        portfolioError = nil
        do {
            try await apiClient.delete(Endpoint.myPublicProfilePortfolioItem(id))
            portfolio.removeAll { $0.id == id }
        } catch {
            portfolioError = tr(
                "settings.public_profile.portfolio_delete_failed",
                "No se pudo quitar el elemento."
            )
        }
    }

    // MARK: - Share

    @MainActor
    public func markCopied() {
        didCopyShareURL = true
        Task {
            try? await Task.sleep(for: .seconds(2))
            didCopyShareURL = false
        }
    }
}
