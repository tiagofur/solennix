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
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
