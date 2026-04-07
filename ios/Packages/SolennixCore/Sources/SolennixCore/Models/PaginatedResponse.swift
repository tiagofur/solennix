import Foundation

/// Generic paginated response from the backend.
///
/// The backend canonical shape is:
/// ```json
/// { "data": [...], "total": 100, "page": 1, "limit": 20, "total_pages": 5 }
/// ```
///
/// All envelope fields except `data` are decoded as optional and inferred from
/// `data.count` when missing. Older backend builds and bare `{"data": [...]}`
/// responses must keep working — Codable's strictness is wrong for a wire
/// protocol that evolves on the server side.
public struct PaginatedResponse<T: Decodable>: Decodable {
    public let data: [T]
    public let total: Int
    public let page: Int
    public let limit: Int
    public let totalPages: Int

    enum CodingKeys: String, CodingKey {
        case data, total, page, limit
        case totalPages = "total_pages"
    }

    public init(data: [T], total: Int, page: Int, limit: Int, totalPages: Int) {
        self.data = data
        self.total = total
        self.page = page
        self.limit = limit
        self.totalPages = totalPages
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let decodedData = try container.decode([T].self, forKey: .data)
        let decodedTotal = try container.decodeIfPresent(Int.self, forKey: .total) ?? decodedData.count
        let decodedPage = try container.decodeIfPresent(Int.self, forKey: .page) ?? 1
        let decodedLimit = try container.decodeIfPresent(Int.self, forKey: .limit) ?? max(decodedData.count, 1)
        let decodedTotalPages = try container.decodeIfPresent(Int.self, forKey: .totalPages)
            ?? max(1, Int((Double(decodedTotal) / Double(decodedLimit)).rounded(.up)))

        self.data = decodedData
        self.total = decodedTotal
        self.page = decodedPage
        self.limit = decodedLimit
        self.totalPages = decodedTotalPages
    }
}
