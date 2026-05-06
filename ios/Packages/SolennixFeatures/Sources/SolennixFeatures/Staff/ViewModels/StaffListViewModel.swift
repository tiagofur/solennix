import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Sort Key

public enum StaffSortKey: String, CaseIterable {
    case name
    case roleLabel
    case createdAt

    public var label: String {
        switch self {
        case .name:        return StaffStrings.sortName
        case .roleLabel:   return StaffStrings.sortRole
        case .createdAt:   return StaffStrings.sortCreatedAt
        }
    }
}

// MARK: - Staff List View Model

@MainActor
@Observable
public final class StaffListViewModel {

    // MARK: - Properties

    public var staff: [Staff] = []
    public var filteredStaff: [Staff] = []
    public var searchText: String = "" {
        didSet { applyFilters() }
    }
    public var isLoading: Bool = false
    public var sortKey: StaffSortKey = .name {
        didSet { applyFilters() }
    }
    public var sortAscending: Bool = true {
        didSet { applyFilters() }
    }
    public var deleteTarget: Staff?
    public var showDeleteConfirm: Bool = false
    public var errorMessage: String?

    // MARK: - Pagination

    public var currentPage: Int = 1
    public let pageSize: Int = 20
    public var totalPages: Int = 1
    public var totalItems: Int = 0
    public var isLoadingMore: Bool = false

    /// Whether there are more server pages to fetch.
    public var hasMorePages: Bool {
        currentPage < totalPages
    }

    /// Backward-compatible computed property. When using server-side pagination
    /// this returns the full `filteredStaff` array (already paginated on server).
    public var paginatedStaff: [Staff] {
        filteredStaff
    }

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Computed

    /// Whether a search filter is active (skip server pagination).
    private var isFiltering: Bool {
        !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    // MARK: - Data Loading

    @MainActor
    public func loadStaff() async {
        isLoading = true
        errorMessage = nil

        do {
            if isFiltering {
                // Server search via `q` param.
                let trimmed = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
                let result: [Staff] = try await apiClient.getAll(
                    Endpoint.staff,
                    params: ["q": trimmed]
                )
                staff = result
                currentPage = 1
                totalPages = 1
                totalItems = result.count
            } else {
                let sortParam: String
                switch sortKey {
                case .name:      sortParam = "name"
                case .roleLabel: sortParam = "role_label"
                case .createdAt: sortParam = "created_at"
                }
                let params: [String: String] = [
                    "page": "\(currentPage)",
                    "limit": "\(pageSize)",
                    "sort": sortParam,
                    "order": sortAscending ? "asc" : "desc"
                ]
                let paginated: PaginatedResponse<Staff> = try await apiClient.getPaginated(
                    Endpoint.staff,
                    params: params
                )
                if currentPage == 1 {
                    staff = paginated.data
                } else {
                    staff.append(contentsOf: paginated.data)
                }
                totalPages = paginated.totalPages
                totalItems = paginated.total
            }
            applyFilters()
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    /// Load the next page (infinite scroll).
    @MainActor
    public func loadMore() async {
        guard !isLoadingMore, hasMorePages, !isFiltering else { return }
        isLoadingMore = true
        currentPage += 1

        do {
            let sortParam: String
            switch sortKey {
            case .name:      sortParam = "name"
            case .roleLabel: sortParam = "role_label"
            case .createdAt: sortParam = "created_at"
            }
            let params: [String: String] = [
                "page": "\(currentPage)",
                "limit": "\(pageSize)",
                "sort": sortParam,
                "order": sortAscending ? "asc" : "desc"
            ]
            let paginated: PaginatedResponse<Staff> = try await apiClient.getPaginated(
                Endpoint.staff,
                params: params
            )
            staff.append(contentsOf: paginated.data)
            totalPages = paginated.totalPages
            totalItems = paginated.total
            applyFilters()
        } catch {
            currentPage -= 1
            errorMessage = mapError(error)
        }
        isLoadingMore = false
    }

    /// Reset pagination and reload from page 1.
    @MainActor
    public func resetPagination() async {
        currentPage = 1
        totalPages = 1
        totalItems = 0
        staff = []
        await loadStaff()
    }

    // MARK: - Delete

    @MainActor
    public func deleteStaff(_ item: Staff) async {
        do {
            try await apiClient.delete(Endpoint.staff(item.id))
            staff.removeAll { $0.id == item.id }
            applyFilters()
        } catch {
            errorMessage = mapError(error)
        }
    }

    /// Remove the staff from the local list immediately (for undo pattern).
    /// Returns the removed staff and its index for restoration.
    @MainActor
    public func softDeleteStaff(_ item: Staff) -> (staff: Staff, index: Int)? {
        guard let index = staff.firstIndex(where: { $0.id == item.id }) else { return nil }
        let removed = staff.remove(at: index)
        applyFilters()
        return (removed, index)
    }

    /// Restore a previously soft-deleted staff.
    @MainActor
    public func restoreStaff(_ item: Staff, at index: Int) {
        let safeIndex = min(index, staff.count)
        staff.insert(item, at: safeIndex)
        applyFilters()
    }

    /// Permanently delete via API (after undo grace period).
    @MainActor
    public func confirmDeleteStaff(_ item: Staff) async {
        do {
            try await apiClient.delete(Endpoint.staff(item.id))
        } catch {
            // Restore on failure
            staff.append(item)
            applyFilters()
            errorMessage = mapError(error)
        }
    }

    // MARK: - Filtering & Sorting

    public func applyFilters() {
        var result = staff

        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !query.isEmpty {
            result = result.filter { s in
                s.name.lowercased().contains(query)
                || (s.roleLabel?.lowercased().contains(query) ?? false)
                || (s.phone?.lowercased().contains(query) ?? false)
                || (s.email?.lowercased().contains(query) ?? false)
            }
        }

        result.sort { a, b in
            let ascending: Bool
            switch sortKey {
            case .name:
                ascending = a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
            case .roleLabel:
                let aRole = a.roleLabel ?? ""
                let bRole = b.roleLabel ?? ""
                ascending = aRole.localizedCaseInsensitiveCompare(bRole) == .orderedAscending
            case .createdAt:
                ascending = a.createdAt < b.createdAt
            }
            return sortAscending ? ascending : !ascending
        }

        filteredStaff = result
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? StaffStrings.unexpectedError
        }
        return StaffStrings.unexpectedErrorRetry
    }
}
