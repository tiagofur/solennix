import Foundation

public struct Product: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let userId: String
    public let name: String
    public let category: String
    public let basePrice: Double
    public var recipe: AnyCodable?
    public var imageUrl: String?
    public let isActive: Bool
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
        isActive: Bool,
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
        self.isActive = isActive
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
