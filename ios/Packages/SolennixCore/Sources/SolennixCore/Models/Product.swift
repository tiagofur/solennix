import Foundation

public struct Product: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let userId: String
    public let name: String
    public let category: String
    public let basePrice: Double
    public var recipe: AnyCodable?
    public var imageUrl: String?
    /// Ola 3 — team opcional que se expande en staff al agregar el producto
    /// a un evento. Snapshot en el form: ediciones posteriores del team no
    /// tocan eventos ya guardados.
    public var staffTeamId: String?
    public let isActive: Bool
    /// When true, product appears on the organizer's public profile services list.
    /// New products default to visible (DB default true); no plan cap applies.
    public var showOnPublicProfile: Bool
    /// When true, the service is highlighted and sorts first on the public profile.
    /// Orthogonal to showOnPublicProfile (visibility vs. hierarchy).
    public var isFeatured: Bool
    public let createdAt: String
    public let updatedAt: String

    // MARK: - Init

    public init(
        id: String,
        userId: String,
        name: String,
        category: String,
        basePrice: Double,
        recipe: AnyCodable? = nil,
        imageUrl: String? = nil,
        staffTeamId: String? = nil,
        isActive: Bool,
        showOnPublicProfile: Bool = true,
        isFeatured: Bool = false,
        createdAt: String,
        updatedAt: String
    ) {
        self.id = id
        self.userId = userId
        self.name = name
        self.category = category
        self.basePrice = basePrice
        self.recipe = recipe
        self.imageUrl = imageUrl
        self.staffTeamId = staffTeamId
        self.isActive = isActive
        self.showOnPublicProfile = showOnPublicProfile
        self.isFeatured = isFeatured
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    // MARK: - Codable

    private enum CodingKeys: String, CodingKey {
        case id, userId, name, category, basePrice, recipe, imageUrl
        case staffTeamId, isActive, showOnPublicProfile, isFeatured, createdAt, updatedAt
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        userId = try c.decode(String.self, forKey: .userId)
        name = try c.decode(String.self, forKey: .name)
        category = try c.decode(String.self, forKey: .category)
        basePrice = try c.decode(Double.self, forKey: .basePrice)
        recipe = try c.decodeIfPresent(AnyCodable.self, forKey: .recipe)
        imageUrl = try c.decodeIfPresent(String.self, forKey: .imageUrl)
        staffTeamId = try c.decodeIfPresent(String.self, forKey: .staffTeamId)
        isActive = try c.decode(Bool.self, forKey: .isActive)
        // Older payloads omit the field — default true (new DB default).
        showOnPublicProfile = try c.decodeIfPresent(Bool.self, forKey: .showOnPublicProfile) ?? true
        isFeatured = try c.decodeIfPresent(Bool.self, forKey: .isFeatured) ?? false
        createdAt = try c.decode(String.self, forKey: .createdAt)
        updatedAt = try c.decode(String.self, forKey: .updatedAt)
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(userId, forKey: .userId)
        try c.encode(name, forKey: .name)
        try c.encode(category, forKey: .category)
        try c.encode(basePrice, forKey: .basePrice)
        try c.encodeIfPresent(recipe, forKey: .recipe)
        try c.encodeIfPresent(imageUrl, forKey: .imageUrl)
        try c.encodeIfPresent(staffTeamId, forKey: .staffTeamId)
        try c.encode(isActive, forKey: .isActive)
        try c.encode(showOnPublicProfile, forKey: .showOnPublicProfile)
        try c.encode(isFeatured, forKey: .isFeatured)
        try c.encode(createdAt, forKey: .createdAt)
        try c.encode(updatedAt, forKey: .updatedAt)
    }
}
