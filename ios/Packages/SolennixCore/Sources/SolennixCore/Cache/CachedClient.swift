import Foundation
import SwiftData

// MARK: - CachedClient

/// SwiftData model mirroring the `Client` struct for offline caching.
@Model
public final class CachedClient {

    // MARK: - Properties

    @Attribute(.unique)
    public var id: String

    public var userId: String
    public var name: String
    public var phone: String
    public var email: String?
    public var address: String?
    public var city: String?
    public var notes: String?
    public var photoUrl: String?
    public var totalEvents: Int?
    public var totalSpent: Double?
    public var createdAt: String
    public var updatedAt: String

    // MARK: - Init

    public init(
        id: String,
        userId: String,
        name: String,
        phone: String,
        email: String? = nil,
        address: String? = nil,
        city: String? = nil,
        notes: String? = nil,
        photoUrl: String? = nil,
        totalEvents: Int? = nil,
        totalSpent: Double? = nil,
        createdAt: String,
        updatedAt: String
    ) {
        self.id = id
        self.userId = userId
        self.name = name
        self.phone = phone
        self.email = email
        self.address = address
        self.city = city
        self.notes = notes
        self.photoUrl = photoUrl
        self.totalEvents = totalEvents
        self.totalSpent = totalSpent
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    /// Creates a cached version from a `Client` struct.
    public convenience init(from client: Client) {
        self.init(
            id: client.id,
            userId: client.userId,
            name: client.name,
            phone: client.phone,
            email: client.email,
            address: client.address,
            city: client.city,
            notes: client.notes,
            photoUrl: client.photoUrl,
            totalEvents: client.totalEvents,
            totalSpent: client.totalSpent,
            createdAt: client.createdAt,
            updatedAt: client.updatedAt
        )
    }

    // MARK: - Conversion

    /// Converts this cached model back to a `Client` value type.
    public func toClient() -> Client {
        Client(
            id: id,
            userId: userId,
            name: name,
            phone: phone,
            email: email,
            address: address,
            city: city,
            notes: notes,
            photoUrl: photoUrl,
            totalEvents: totalEvents,
            totalSpent: totalSpent,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}
