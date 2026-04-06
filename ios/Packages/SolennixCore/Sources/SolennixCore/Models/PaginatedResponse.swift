import Foundation

/// Generic paginated response from the backend.
///
/// The backend returns this shape when `?page=` is provided:
/// ```json
/// { "data": [...], "total": 100, "page": 1, "limit": 20, "total_pages": 5 }
/// ```
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
}
