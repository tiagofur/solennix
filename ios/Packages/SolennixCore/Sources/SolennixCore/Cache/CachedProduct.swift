import Foundation
import SwiftData

// MARK: - CachedProduct

/// SwiftData model mirroring the `Product` struct for offline caching.
@Model
public final class CachedProduct {

    // MARK: - Properties

    @Attribute(.unique)
    public var id: String

    public var userId: String
    public var name: String
    public var category: String
    public var basePrice: Double
    /// JSON string representation of the recipe `AnyCodable` value.
    public var recipeJSON: String?
    public var imageUrl: String?
    public var isActive: Bool
    public var createdAt: String
    public var updatedAt: String

    // MARK: - Init

    public init(
        id: String,
        userId: String,
        name: String,
        category: String,
        basePrice: Double,
        recipeJSON: String? = nil,
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
        self.recipeJSON = recipeJSON
        self.imageUrl = imageUrl
        self.isActive = isActive
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    /// Creates a cached version from a `Product` struct.
    public convenience init(from product: Product) {
        var recipeString: String?
        if let recipe = product.recipe {
            if let data = try? JSONEncoder().encode(recipe) {
                recipeString = String(data: data, encoding: .utf8)
            }
        }

        self.init(
            id: product.id,
            userId: product.userId,
            name: product.name,
            category: product.category,
            basePrice: product.basePrice,
            recipeJSON: recipeString,
            imageUrl: product.imageUrl,
            isActive: product.isActive,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
        )
    }

    // MARK: - Conversion

    /// Converts this cached model back to a `Product` value type.
    public func toProduct() -> Product {
        var recipe: AnyCodable?
        if let json = recipeJSON, let data = json.data(using: .utf8) {
            recipe = try? JSONDecoder().decode(AnyCodable.self, from: data)
        }

        return Product(
            id: id,
            userId: userId,
            name: name,
            category: category,
            basePrice: basePrice,
            recipe: recipe,
            imageUrl: imageUrl,
            isActive: isActive,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}
