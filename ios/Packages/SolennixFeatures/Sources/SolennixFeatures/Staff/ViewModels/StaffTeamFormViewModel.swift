import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Staff Team Member Draft

/// Draft en memoria — union del staff elegido + flags editables.
/// `position` se calcula al guardar por el orden del array.
public struct StaffTeamMemberDraft: Identifiable, Hashable {
    public var staffId: String
    public var staffName: String
    public var staffRoleLabel: String?
    public var staffPhone: String?
    public var staffEmail: String?
    public var isLead: Bool

    public var id: String { staffId }

    public init(
        staffId: String,
        staffName: String,
        staffRoleLabel: String? = nil,
        staffPhone: String? = nil,
        staffEmail: String? = nil,
        isLead: Bool = false
    ) {
        self.staffId = staffId
        self.staffName = staffName
        self.staffRoleLabel = staffRoleLabel
        self.staffPhone = staffPhone
        self.staffEmail = staffEmail
        self.isLead = isLead
    }
}

// MARK: - Staff Team Form View Model

@Observable
public final class StaffTeamFormViewModel {

    // MARK: - Form Fields

    public var name: String = ""
    public var roleLabel: String = ""
    public var notes: String = ""
    public var members: [StaffTeamMemberDraft] = []

    /// Catalogo completo de staff — se carga una sola vez para el picker.
    public var staffCatalog: [Staff] = []

    // MARK: - UI State

    public var isLoading: Bool = false
    public var isSaving: Bool = false
    public var errorMessage: String?
    public var isEdit: Bool = false
    public var editId: String?

    // MARK: - Dependencies

    private let apiClient: APIClient

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Validation

    public var isNameValid: Bool {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty && trimmed.count <= 255
    }

    public var isFormValid: Bool {
        isNameValid
    }

    // MARK: - Load

    @MainActor
    public func loadCatalog() async {
        do {
            let items: [Staff] = try await apiClient.getAll(Endpoint.staff)
            staffCatalog = items
        } catch {
            errorMessage = mapError(error)
        }
    }

    @MainActor
    public func loadTeam(id: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let team = try await apiClient.getStaffTeam(id: id)
            name = team.name
            roleLabel = team.roleLabel ?? ""
            notes = team.notes ?? ""
            isEdit = true
            editId = team.id

            let sorted = (team.members ?? []).sorted { $0.position < $1.position }
            members = sorted.map { m in
                StaffTeamMemberDraft(
                    staffId: m.staffId,
                    staffName: m.staffName ?? "(sin nombre)",
                    staffRoleLabel: m.staffRoleLabel,
                    staffPhone: m.staffPhone,
                    staffEmail: m.staffEmail,
                    isLead: m.isLead
                )
            }
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    // MARK: - Member Operations

    public func addMember(_ staff: Staff) {
        guard !members.contains(where: { $0.staffId == staff.id }) else { return }
        members.append(
            StaffTeamMemberDraft(
                staffId: staff.id,
                staffName: staff.name,
                staffRoleLabel: staff.roleLabel,
                staffPhone: staff.phone,
                staffEmail: staff.email
            )
        )
    }

    public func removeMember(at offsets: IndexSet) {
        members.remove(atOffsets: offsets)
    }

    public func moveMember(from source: IndexSet, to destination: Int) {
        members.move(fromOffsets: source, toOffset: destination)
    }

    public func toggleLead(for staffId: String) {
        guard let idx = members.firstIndex(where: { $0.staffId == staffId }) else { return }
        members[idx].isLead.toggle()
    }

    // MARK: - Save

    @MainActor
    public func save() async -> StaffTeam? {
        guard isFormValid else {
            errorMessage = "El nombre es obligatorio"
            return nil
        }

        isSaving = true
        errorMessage = nil

        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedRole = roleLabel.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)

        let memberPayloads = members.enumerated().map { idx, draft in
            StaffTeamMemberPayload(
                staffId: draft.staffId,
                isLead: draft.isLead,
                position: idx
            )
        }

        let payload = StaffTeamPayload(
            name: trimmedName,
            roleLabel: trimmedRole.isEmpty ? nil : trimmedRole,
            notes: trimmedNotes.isEmpty ? nil : trimmedNotes,
            members: memberPayloads
        )

        do {
            let result: StaffTeam
            if isEdit, let editId {
                result = try await apiClient.updateStaffTeam(id: editId, payload: payload)
            } else {
                result = try await apiClient.createStaffTeam(payload)
            }
            HapticsHelper.play(.success)
            isSaving = false
            return result
        } catch {
            HapticsHelper.play(.error)
            errorMessage = mapError(error)
            isSaving = false
            return nil
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
