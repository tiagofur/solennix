import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Staff Team List View Model

@Observable
public final class StaffTeamListViewModel {

    // MARK: - State

    public var teams: [StaffTeam] = []
    public var isLoading: Bool = false
    public var errorMessage: String?
    public var searchText: String = ""
    public var deleteTarget: StaffTeam?
    public var showDeleteConfirm: Bool = false

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Derived

    public var filteredTeams: [StaffTeam] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return teams }
        return teams.filter { team in
            team.name.lowercased().contains(query)
            || (team.roleLabel?.lowercased().contains(query) ?? false)
        }
    }

    // MARK: - Load

    @MainActor
    public func load() async {
        isLoading = true
        errorMessage = nil

        do {
            teams = try await apiClient.listStaffTeams()
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    // MARK: - Delete

    @MainActor
    public func deleteTeam(_ team: StaffTeam) async {
        do {
            try await apiClient.deleteStaffTeam(id: team.id)
            teams.removeAll { $0.id == team.id }
        } catch {
            errorMessage = mapError(error)
        }
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? "Ocurrio un error inesperado."
        }
        return "Ocurrio un error inesperado. Intenta de nuevo."
    }
}
