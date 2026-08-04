import Foundation

// MARK: - Nested public profile types (GET /public/organizers/{slug})

public struct PublicLocation: Codable, Sendable, Hashable {
    public let city: String?
    public let region: String?
    public let country: String?

    public var formatted: String {
        [city, region, country].compactMap { $0?.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }.joined(separator: ", ")
    }
}

public struct PublicContact: Codable, Sendable, Hashable {
    public let type: String
    public let value: String
}

public struct PublicProfileService: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let name: String
    public let category: String
    public let imageUrl: String?
    public let basePrice: Double?
    public let isFeatured: Bool?
}

public struct PublicReview: Codable, Sendable, Hashable, Identifiable {
    public var id: String { "\(displayName)-\(submittedAt)-\(rating)" }
    public let rating: Int
    public let comment: String?
    public let submittedAt: String
    public let organizerResponse: String?
    public let displayName: String
    public let eventLabel: String?
}

public struct PublicPortfolioItem: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let title: String
    public let eventDate: String?
    public let photoUrl: String
    public let thumbnailUrl: String?
    public let sortOrder: Int?
}

public struct PublicPackage: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let title: String
    public let description: String?
    public let fromPrice: Double?
    public let inclusions: [String]?
    public let imageUrl: String?
    public let isFeatured: Bool?
    public let sortOrder: Int?
}

public struct PublicFaqItem: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let question: String
    public let answer: String
    public let sortOrder: Int?
}

public struct PublicPolicies: Codable, Sendable, Hashable {
    public let depositPercent: Double?
    public let cancellationDays: Int?
    public let refundPercent: Double?
}

// MARK: - Public organizer profile

/// Visitor-facing public organizer profile from `GET /public/organizers/{slug}`.
/// Plan-aware: Free omits reviews/portfolio/socials on the backend.
public struct PublicOrganizerProfile: Codable, Sendable, Hashable, Identifiable {
    public var id: String { slug }

    public let slug: String
    public let businessName: String?
    public let showBusinessName: Bool?
    public let logoUrl: String?
    public let coverUrl: String?
    public let brandColor: String?
    public let headline: String?
    public let about: String?
    public let serviceAreas: [String]?
    public let minGuests: Int?
    public let maxGuests: Int?
    public let eventTypes: [String]?
    public let responseTime: String?
    public let languages: [String]?
    public let location: PublicLocation?
    public let contact: PublicContact?
    public let services: [PublicProfileService]?
    public let reviews: [PublicReview]?
    public let portfolio: [PublicPortfolioItem]?
    public let socials: [String: String]?
    public let packages: [PublicPackage]?
    public let faq: [PublicFaqItem]?
    public let policies: PublicPolicies?
    public let eventsCompleted: Int?
    public let averageRating: Double?
    public let reviewsCount: Int?

    public var displayName: String {
        if showBusinessName == false { return headline ?? slug }
        return businessName ?? headline ?? slug
    }

    public var publicURL: String {
        SolennixURLs.publicProfileURL(slug: slug)
    }
}
