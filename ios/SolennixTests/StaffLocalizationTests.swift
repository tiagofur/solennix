import XCTest
import Foundation
@testable import SolennixFeatures

// MARK: - Staff Localization Tests

/// Resolution smoke tests (B-1, system-locale resolution). See the contract in
/// `AuthLocalizationTests`; these tests assert the EXPECTED value for the
/// simulator's current system locale (no runtime override — retired in B-1).
final class StaffLocalizationTests: XCTestCase {

    private func expected(spanish: String, english: String) -> String {
        FeatureL10n.languageCode == "en" ? english : spanish
    }

    func testStaffSharedStringsResolve() {
        // Shared
        XCTAssertEqual(StaffStrings.cancel, expected(spanish: "Cancelar", english: "Cancel"))
        XCTAssertEqual(StaffStrings.edit, expected(spanish: "Editar", english: "Edit"))
        XCTAssertEqual(StaffStrings.save, expected(spanish: "Guardar", english: "Save"))
        XCTAssertEqual(StaffStrings.close, expected(spanish: "Cerrar", english: "Close"))
        XCTAssertEqual(StaffStrings.loading, expected(spanish: "Cargando...", english: "Loading..."))
        XCTAssertEqual(StaffStrings.errorTitle, expected(spanish: "Error", english: "Error"))
        XCTAssertEqual(StaffStrings.retry, expected(spanish: "Reintentar", english: "Retry"))
        XCTAssertEqual(StaffStrings.errorLoadingTitle, expected(spanish: "Error al cargar", english: "Loading error"))
        XCTAssertEqual(StaffStrings.filteredEmptyTitle, expected(spanish: "Sin resultados", english: "No results"))
        XCTAssertEqual(StaffStrings.unexpectedError, expected(spanish: "Ocurrió un error inesperado.", english: "An unexpected error occurred."))
        XCTAssertEqual(StaffStrings.unexpectedErrorRetry, expected(spanish: "Ocurrió un error inesperado. Intentá de nuevo.", english: "An unexpected error occurred. Try again."))
        XCTAssertEqual(StaffStrings.notesTitle, expected(spanish: "Notas", english: "Notes"))
        XCTAssertEqual(StaffStrings.membersTitle, expected(spanish: "Miembros", english: "Members"))
        XCTAssertEqual(StaffStrings.deleteAction, expected(spanish: "Eliminar", english: "Delete"))
        XCTAssertEqual(StaffStrings.callAction, expected(spanish: "Llamar", english: "Call"))
    }

    func testStaffSortStringsResolve() {
        // Sort
        XCTAssertEqual(StaffStrings.sortTitle, expected(spanish: "Ordenar por", english: "Sort by"))
        XCTAssertEqual(StaffStrings.sortName, expected(spanish: "Nombre", english: "Name"))
        XCTAssertEqual(StaffStrings.sortRole, expected(spanish: "Rol", english: "Role"))
        XCTAssertEqual(StaffStrings.sortCreatedAt, expected(spanish: "Fecha de creación", english: "Created date"))
        XCTAssertEqual(StaffStrings.sortAscending, expected(spanish: "Ascendente", english: "Ascending"))
        XCTAssertEqual(StaffStrings.sortDescending, expected(spanish: "Descendente", english: "Descending"))
        XCTAssertEqual(StaffStrings.sortAccessibility, expected(spanish: "Ordenar personal", english: "Sort staff"))
    }

    func testStaffListStringsResolve() {
        // Staff List
        XCTAssertEqual(StaffStrings.title, expected(spanish: "Personal", english: "Staff"))
        XCTAssertEqual(StaffStrings.searchPrompt, expected(spanish: "Buscar personal", english: "Search staff"))
        XCTAssertEqual(StaffStrings.addAccessibility, expected(spanish: "Agregar personal", english: "Add staff member"))
        XCTAssertEqual(StaffStrings.emptyTitle, expected(spanish: "Sin personal", english: "No staff yet"))
        XCTAssertEqual(StaffStrings.emptyMessage, expected(spanish: "Agregá a tu primer colaborador para asignarlo a eventos", english: "Add your first staff member to assign them to events"))
        XCTAssertEqual(StaffStrings.emptyAction, expected(spanish: "Agregar Personal", english: "Add Staff"))
        XCTAssertEqual(StaffStrings.filteredEmptyMessage, expected(spanish: "No se encontró personal que coincida con tu búsqueda", english: "No staff members matched your search"))
        XCTAssertEqual(StaffStrings.teamsLinkTitle, expected(spanish: "Equipos", english: "Teams"))
        XCTAssertEqual(StaffStrings.teamsLinkSubtitle, expected(spanish: "Armá cuadrillas para asignarlas de un toque", english: "Group your crew to assign them with a single tap"))
    }

    func testStaffDeleteStringsResolve() {
        // Staff Delete
        XCTAssertEqual(StaffStrings.deleteTitle, expected(spanish: "Eliminar personal", english: "Delete staff member"))
        XCTAssertEqual(StaffStrings.deletedToast("Juan"), expected(spanish: "Juan eliminado", english: "Juan deleted"))
        XCTAssertEqual(StaffStrings.deleteMessage("Juan"), expected(spanish: "Se eliminará a Juan. Podrás deshacer durante unos segundos.", english: "Remove Juan? You can undo this for a few seconds."))
        XCTAssertEqual(StaffStrings.deleteConfirmMessage("Juan"), expected(spanish: "¿Estás seguro de que querés eliminar a Juan? Esta acción no se puede deshacer.", english: "Are you sure you want to delete Juan? This action cannot be undone."))
    }

    func testStaffDetailStringsResolve() {
        // Staff Detail
        XCTAssertEqual(StaffStrings.loadingStaff, expected(spanish: "Cargando personal...", english: "Loading staff member..."))
        XCTAssertEqual(StaffStrings.notFoundMessage, expected(spanish: "No se pudo cargar el personal", english: "Could not load staff member"))
        XCTAssertEqual(StaffStrings.navTitleFallback, expected(spanish: "Personal", english: "Staff member"))
        XCTAssertEqual(StaffStrings.deleteError, expected(spanish: "Error al eliminar el personal", english: "Failed to delete staff member"))
        XCTAssertEqual(StaffStrings.emailNotifTitle, expected(spanish: "Avisos por email activados", english: "Email notifications enabled"))
        XCTAssertEqual(StaffStrings.emailNotifSubtitle, expected(spanish: "Se activará en Phase 2 (Pro+). Por ahora queda registrada la preferencia.", english: "Will be activated in Phase 2 (Pro+). Preference is saved."))
        XCTAssertEqual(StaffStrings.inviteAccess, expected(spanish: "Invitar acceso", english: "Invite access"))
        XCTAssertEqual(StaffStrings.inviting, expected(spanish: "Invitando...", english: "Inviting..."))
        XCTAssertEqual(StaffStrings.inviteLinkTitle, expected(spanish: "Link de invitación", english: "Invite link"))
        XCTAssertEqual(StaffStrings.copyInviteLink, expected(spanish: "Copiar link", english: "Copy link"))
        XCTAssertEqual(StaffStrings.inviteLinkCopied, expected(spanish: "Link copiado", english: "Invite link copied"))
        XCTAssertEqual(StaffStrings.inviteCreated, expected(spanish: "Invitación creada correctamente", english: "Invite created successfully"))
        XCTAssertEqual(StaffStrings.inviteCreateError, expected(spanish: "No se pudo crear la invitación", english: "Could not create invite"))
        XCTAssertEqual(StaffStrings.invitePendingActive, expected(spanish: "Hay una invitación activa pendiente.", english: "There is an active pending invite."))
        XCTAssertEqual(StaffStrings.inviteEmailRequired, expected(spanish: "Este colaborador necesita email para activar acceso", english: "This staff member needs an email to activate access"))
        XCTAssertEqual(StaffStrings.inviteAlreadyActivated, expected(spanish: "Este colaborador ya tiene acceso activado", english: "This staff member already has activated access"))
        XCTAssertEqual(StaffStrings.revokeInvite, expected(spanish: "Revocar invitación", english: "Revoke invite"))
        XCTAssertEqual(StaffStrings.revoking, expected(spanish: "Revocando...", english: "Revoking..."))
        XCTAssertEqual(StaffStrings.revokeConfirmTitle, expected(spanish: "Revocar invitación", english: "Revoke invite"))
        XCTAssertEqual(StaffStrings.revokeConfirmMessage, expected(spanish: "La invitación quedará desactivada y el enlace dejará de funcionar.", english: "The invite will be deactivated and the link will stop working."))
        XCTAssertEqual(StaffStrings.inviteRevoked, expected(spanish: "Invitación revocada", english: "Invite revoked"))
        XCTAssertEqual(StaffStrings.inviteRevokeError, expected(spanish: "No se pudo revocar la invitación", english: "Could not revoke invite"))
    }

    func testStaffFormStringsResolve() {
        // Staff Form
        XCTAssertEqual(StaffStrings.editTitle, expected(spanish: "Editar Personal", english: "Edit Staff"))
        XCTAssertEqual(StaffStrings.newTitle, expected(spanish: "Nuevo Personal", english: "New Staff"))
        XCTAssertEqual(StaffStrings.sectionInfo, expected(spanish: "Información", english: "Information"))
        XCTAssertEqual(StaffStrings.fieldName, expected(spanish: "Nombre", english: "Name"))
        XCTAssertEqual(StaffStrings.fieldNamePlaceholder, expected(spanish: "Nombre completo", english: "Full name"))
        XCTAssertEqual(StaffStrings.nameMinError, expected(spanish: "Mínimo 2 caracteres", english: "Minimum 2 characters"))
        XCTAssertEqual(StaffStrings.fieldRole, expected(spanish: "Rol", english: "Role"))
        XCTAssertEqual(StaffStrings.fieldRolePlaceholder, expected(spanish: "Ej: Mesero, DJ, Fotógrafo", english: "Ex: Waiter, DJ, Photographer"))
        XCTAssertEqual(StaffStrings.sectionContact, expected(spanish: "Contacto", english: "Contact"))
        XCTAssertEqual(StaffStrings.fieldPhone, expected(spanish: "Teléfono", english: "Phone"))
        XCTAssertEqual(StaffStrings.fieldPhonePlaceholder, expected(spanish: "10 dígitos", english: "10 digits"))
        XCTAssertEqual(StaffStrings.fieldEmail, expected(spanish: "Email", english: "Email"))
        XCTAssertEqual(StaffStrings.fieldEmailPlaceholder, expected(spanish: "correo@ejemplo.com", english: "email@example.com"))
        XCTAssertEqual(StaffStrings.emailInvalidError, expected(spanish: "Email inválido", english: "Invalid email"))
        XCTAssertEqual(StaffStrings.sectionNotif, expected(spanish: "Avisos", english: "Notifications"))
        XCTAssertEqual(StaffStrings.notifToggleLabel, expected(spanish: "Avisarle por email al asignarlo a un evento", english: "Notify them by email when assigned to an event"))
        XCTAssertEqual(StaffStrings.notifToggleSubtitle, expected(spanish: "Se activará en Phase 2 (Pro+). Por ahora guardamos la preferencia.", english: "Will be activated in Phase 2 (Pro+). Preference is saved."))
        XCTAssertEqual(StaffStrings.notifEmailRequired, expected(spanish: "Para activar el aviso necesitás un email válido", english: "A valid email is required to enable notifications"))
        XCTAssertEqual(StaffStrings.sectionNotes, expected(spanish: "Notas", english: "Notes"))
    }

    func testTeamsListStringsResolve() {
        // Teams List
        XCTAssertEqual(StaffStrings.teamsTitle, expected(spanish: "Equipos", english: "Teams"))
        XCTAssertEqual(StaffStrings.teamsSearchPrompt, expected(spanish: "Buscar equipos", english: "Search teams"))
        XCTAssertEqual(StaffStrings.teamsAddAccessibility, expected(spanish: "Crear equipo", english: "Create team"))
        XCTAssertEqual(StaffStrings.teamDeleteTitle, expected(spanish: "Eliminar equipo", english: "Delete team"))
        XCTAssertEqual(StaffStrings.teamsLoading, expected(spanish: "Cargando equipos...", english: "Loading teams..."))
        XCTAssertEqual(StaffStrings.teamsEmptyTitle, expected(spanish: "Sin equipos todavía", english: "No teams yet"))
        XCTAssertEqual(StaffStrings.teamsEmptyMessage, expected(spanish: "Agrupá a tu equipo de meseros o fotógrafos para asignarlos a un evento con un solo toque.", english: "Group your waiters or photographers to assign them to an event with a single tap."))
        XCTAssertEqual(StaffStrings.teamsEmptyAction, expected(spanish: "Crear equipo", english: "Create team"))
        XCTAssertEqual(StaffStrings.teamsFilteredEmptyMessage, expected(spanish: "No encontramos equipos que coincidan con tu búsqueda", english: "No teams matched your search"))
        XCTAssertEqual(StaffStrings.teamDeleteMessage("Meseros"), expected(spanish: "Se eliminará el equipo Meseros. Los colaboradores individuales no se borran.", english: "The team Meseros will be deleted. Individual members will not be removed."))
    }

    func testTeamsDetailStringsResolve() {
        // Teams Detail
        XCTAssertEqual(StaffStrings.teamsLoadingDetail, expected(spanish: "Cargando equipo...", english: "Loading team..."))
        XCTAssertEqual(StaffStrings.teamNotFoundMessage, expected(spanish: "No se pudo cargar el equipo", english: "Could not load team"))
        XCTAssertEqual(StaffStrings.teamNavFallback, expected(spanish: "Equipo", english: "Team"))
        XCTAssertEqual(StaffStrings.teamDeleteError, expected(spanish: "Error al eliminar el equipo", english: "Failed to delete team"))
        XCTAssertEqual(StaffStrings.teamEmptyMembers, expected(spanish: "Este equipo todavía no tiene miembros. Editalo para agregarlos.", english: "This team has no members yet. Edit it to add some."))
        XCTAssertEqual(StaffStrings.memberNoName, expected(spanish: "(sin nombre)", english: "(no name)"))
        XCTAssertEqual(StaffStrings.memberLeadAccessibility, expected(spanish: "Lidera el equipo", english: "Team lead"))
        XCTAssertEqual(StaffStrings.memberCount(1), expected(spanish: "1 miembro", english: "1 member"))
        XCTAssertEqual(StaffStrings.memberCount(4), expected(spanish: "4 miembros", english: "4 members"))
    }

    func testTeamsFormStringsResolve() {
        // Teams Form
        XCTAssertEqual(StaffStrings.teamEditTitle, expected(spanish: "Editar Equipo", english: "Edit Team"))
        XCTAssertEqual(StaffStrings.teamNewTitle, expected(spanish: "Nuevo Equipo", english: "New Team"))
        XCTAssertEqual(StaffStrings.teamNamePlaceholder, expected(spanish: "Ej: Cuadrilla de meseros A", english: "Ex: Waiter Crew A"))
        XCTAssertEqual(StaffStrings.teamNameError, expected(spanish: "El nombre es obligatorio (max 255)", english: "Name is required (max 255)"))
        XCTAssertEqual(StaffStrings.teamRoleLabel, expected(spanish: "Rol del equipo (opcional)", english: "Team role (optional)"))
        XCTAssertEqual(StaffStrings.teamRolePlaceholder, expected(spanish: "Ej: Meseros, Fotografía", english: "Ex: Waiters, Photography"))
        XCTAssertEqual(StaffStrings.teamNotesLabel, expected(spanish: "Notas internas", english: "Internal notes"))
        XCTAssertEqual(StaffStrings.addMember, expected(spanish: "Agregar miembro", english: "Add member"))
        XCTAssertEqual(StaffStrings.removeLead, expected(spanish: "Quitar liderazgo", english: "Remove as lead"))
        XCTAssertEqual(StaffStrings.setLead, expected(spanish: "Marcar como líder", english: "Mark as lead"))
        XCTAssertEqual(StaffStrings.membersFooter, expected(spanish: "Ordenalos como deberían aparecer al asignar el equipo a un evento. El líder se marca con la corona.", english: "Order them as they should appear when assigning the team to an event. The lead is marked with the crown."))
        XCTAssertEqual(StaffStrings.pickerEmptyMessage, expected(spanish: "Agrega colaboradores en la sección Personal antes de armar equipos", english: "Add staff members in the Staff section before building teams"))
        XCTAssertEqual(StaffStrings.pickerTitle, expected(spanish: "Agregar miembro", english: "Add member"))
    }
}
