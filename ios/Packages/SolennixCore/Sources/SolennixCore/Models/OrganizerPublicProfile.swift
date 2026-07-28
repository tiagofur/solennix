import Foundation

// MARK: - Contact type

/// Public contact channel for the organizer public profile.
public enum PublicContactType: String, Codable, Sendable, CaseIterable, Hashable {
    case phone
    case whatsapp
    case email
    case url
}

// MARK: - Organizer public profile (Settings config)

/// Authenticated organizer public-profile config from
/// `GET/PUT /users/me/public-profile`.
///
/// Note: The APIClient uses `keyDecodingStrategy = .convertFromSnakeCase`,
/// so property names are camelCase without explicit CodingKeys.
public struct OrganizerPublicProfile: Codable, Sendable, Hashable, Identifiable {
    public var id: String { userId }

    public let userId: String
    public var isEnabled: Bool
    public var headline: String?
    public var contactType: PublicContactType?
    public var contactValue: String?
    public var city: String?
    public var region: String?
    public var country: String?
    public var showPrices: Bool
    public var showServices: Bool
    public var showReviews: Bool
    public var showPortfolio: Bool
    public var showContact: Bool
    public var socials: [String: String]?
    public var publicSlug: String?
    public let createdAt: String
    public let updatedAt: String

    public init(
        userId: String = "",
        isEnabled: Bool = false,
        headline: String? = nil,
        contactType: PublicContactType? = nil,
        contactValue: String? = nil,
        city: String? = nil,
        region: String? = nil,
        country: String? = nil,
        showPrices: Bool = false,
        showServices: Bool = true,
        showReviews: Bool = true,
        showPortfolio: Bool = true,
        showContact: Bool = true,
        socials: [String: String]? = nil,
        publicSlug: String? = nil,
        createdAt: String = "",
        updatedAt: String = ""
    ) {
        self.userId = userId
        self.isEnabled = isEnabled
        self.headline = headline
        self.contactType = contactType
        self.contactValue = contactValue
        self.city = city
        self.region = region
        self.country = country
        self.showPrices = showPrices
        self.showServices = showServices
        self.showReviews = showReviews
        self.showPortfolio = showPortfolio
        self.showContact = showContact
        self.socials = socials
        self.publicSlug = publicSlug
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// MARK: - Upsert body

/// PUT /users/me/public-profile body.
public struct OrganizerPublicProfileUpsertRequest: Encodable, Sendable {
    public var isEnabled: Bool?
    public var publicSlug: String?
    public var headline: String?
    public var contactType: String?
    public var contactValue: String?
    public var city: String?
    public var region: String?
    public var country: String?
    public var showPrices: Bool?
    public var showServices: Bool?
    public var showReviews: Bool?
    public var showPortfolio: Bool?
    public var showContact: Bool?
    public var socials: [String: String]?

    public init(
        isEnabled: Bool? = nil,
        publicSlug: String? = nil,
        headline: String? = nil,
        contactType: String? = nil,
        contactValue: String? = nil,
        city: String? = nil,
        region: String? = nil,
        country: String? = nil,
        showPrices: Bool? = nil,
        showServices: Bool? = nil,
        showReviews: Bool? = nil,
        showPortfolio: Bool? = nil,
        showContact: Bool? = nil,
        socials: [String: String]? = nil
    ) {
        self.isEnabled = isEnabled
        self.publicSlug = publicSlug
        self.headline = headline
        self.contactType = contactType
        self.contactValue = contactValue
        self.city = city
        self.region = region
        self.country = country
        self.showPrices = showPrices
        self.showServices = showServices
        self.showReviews = showReviews
        self.showPortfolio = showPortfolio
        self.showContact = showContact
        self.socials = socials
    }
}

// MARK: - Portfolio

/// Pro+ portfolio item from `/users/me/public-profile/portfolio`.
public struct OrganizerPublicPortfolioItem: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let userId: String
    public var eventId: String?
    public var title: String
    public var eventDate: String?
    public var photoUrl: String
    public var thumbnailUrl: String?
    public var sortOrder: Int
    public let createdAt: String
    public let updatedAt: String

    public init(
        id: String,
        userId: String,
        eventId: String? = nil,
        title: String,
        eventDate: String? = nil,
        photoUrl: String,
        thumbnailUrl: String? = nil,
        sortOrder: Int = 0,
        createdAt: String = "",
        updatedAt: String = ""
    ) {
        self.id = id
        self.userId = userId
        self.eventId = eventId
        self.title = title
        self.eventDate = eventDate
        self.photoUrl = photoUrl
        self.thumbnailUrl = thumbnailUrl
        self.sortOrder = sortOrder
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

/// POST /users/me/public-profile/portfolio body.
public struct PortfolioCreateRequest: Encodable, Sendable {
    public let title: String
    public let photoUrl: String
    public var eventId: String?
    public var eventDate: String?
    public var thumbnailUrl: String?
    public var sortOrder: Int?

    public init(
        title: String,
        photoUrl: String,
        eventId: String? = nil,
        eventDate: String? = nil,
        thumbnailUrl: String? = nil,
        sortOrder: Int? = nil
    ) {
        self.title = title
        self.photoUrl = photoUrl
        self.eventId = eventId
        self.eventDate = eventDate
        self.thumbnailUrl = thumbnailUrl
        self.sortOrder = sortOrder
    }
}

// MARK: - Share URL helper

public enum SolennixURLs {
    /// Public web origin used for share links. Do **not** use the API host.
    public static let webBaseURL = "https://solennix.com"

    public static func publicProfileURL(slug: String) -> String {
        "\(webBaseURL)/u/\(slug)"
    }
}
