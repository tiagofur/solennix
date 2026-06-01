import XCTest
import Foundation
@testable import SolennixFeatures

final class StaffLocalizationTests: XCTestCase {

    override func setUp() {
        super.setUp()
        // Save the previous preferred locale to avoid polluting user settings
        let oldLocale = UserDefaults.standard.string(forKey: "preferredLocale")
        addTeardownBlock {
            if let oldLocale = oldLocale {
                UserDefaults.standard.set(oldLocale, forKey: "preferredLocale")
            } else {
                UserDefaults.standard.removeObject(forKey: "preferredLocale")
            }
        }
    }

    func testStaffStringsResolveForSpanish() {
        UserDefaults.standard.set("es-MX", forKey: "preferredLocale")
        
        // Shared
        XCTAssertEqual(StaffStrings.cancel, "Cancelar")
        XCTAssertEqual(StaffStrings.edit, "Editar")
        XCTAssertEqual(StaffStrings.save, "Guardar")
        XCTAssertEqual(StaffStrings.close, "Cerrar")
        XCTAssertEqual(StaffStrings.loading, "Cargando...")
        XCTAssertEqual(StaffStrings.errorTitle, "Error")
        XCTAssertEqual(StaffStrings.retry, "Reintentar")
        XCTAssertEqual(StaffStrings.errorLoadingTitle, "Error al cargar")
        XCTAssertEqual(StaffStrings.filteredEmptyTitle, "Sin resultados")
        XCTAssertEqual(StaffStrings.unexpectedError, "Ocurrió un error inesperado.")
        XCTAssertEqual(StaffStrings.unexpectedErrorRetry, "Ocurrió un error inesperado. Intentá de nuevo.")
        XCTAssertEqual(StaffStrings.notesTitle, "Notas")
        XCTAssertEqual(StaffStrings.membersTitle, "Miembros")
        XCTAssertEqual(StaffStrings.deleteAction, "Eliminar")
        XCTAssertEqual(StaffStrings.callAction, "Llamar")

        // Sort
        XCTAssertEqual(StaffStrings.sortTitle, "Ordenar por")
        XCTAssertEqual(StaffStrings.sortName, "Nombre")
        XCTAssertEqual(StaffStrings.sortRole, "Rol")
        XCTAssertEqual(StaffStrings.sortCreatedAt, "Fecha de creación")
        XCTAssertEqual(StaffStrings.sortAscending, "Ascendente")
        XCTAssertEqual(StaffStrings.sortDescending, "Descendente")
        XCTAssertEqual(StaffStrings.sortAccessibility, "Ordenar personal")

        // Staff List
        XCTAssertEqual(StaffStrings.title, "Personal")
        XCTAssertEqual(StaffStrings.searchPrompt, "Buscar personal")
        XCTAssertEqual(StaffStrings.addAccessibility, "Agregar personal")
        XCTAssertEqual(StaffStrings.emptyTitle, "Sin personal")
        XCTAssertEqual(StaffStrings.emptyMessage, "Agregá a tu primer colaborador para asignarlo a eventos")
        XCTAssertEqual(StaffStrings.emptyAction, "Agregar Personal")
        XCTAssertEqual(StaffStrings.filteredEmptyMessage, "No se encontró personal que coincida con tu búsqueda")
        XCTAssertEqual(StaffStrings.teamsLinkTitle, "Equipos")
        XCTAssertEqual(StaffStrings.teamsLinkSubtitle, "Armá cuadrillas para asignarlas de un toque")

        // Staff Delete
        XCTAssertEqual(StaffStrings.deleteTitle, "Eliminar personal")
        XCTAssertEqual(StaffStrings.deletedToast("Juan"), "Juan eliminado")
        XCTAssertEqual(StaffStrings.deleteMessage("Juan"), "Se eliminará a Juan. Podrás deshacer durante unos segundos.")
        XCTAssertEqual(StaffStrings.deleteConfirmMessage("Juan"), "¿Estás seguro de que querés eliminar a Juan? Esta acción no se puede deshacer.")

        // Staff Detail
        XCTAssertEqual(StaffStrings.loadingStaff, "Cargando personal...")
        XCTAssertEqual(StaffStrings.notFoundMessage, "No se pudo cargar el personal")
        XCTAssertEqual(StaffStrings.navTitleFallback, "Personal")
        XCTAssertEqual(StaffStrings.deleteError, "Error al eliminar el personal")
        XCTAssertEqual(StaffStrings.emailNotifTitle, "Avisos por email activados")
        XCTAssertEqual(StaffStrings.emailNotifSubtitle, "Se activará en Phase 2 (Pro+). Por ahora queda registrada la preferencia.")
        XCTAssertEqual(StaffStrings.inviteAccess, "Invitar acceso")
        XCTAssertEqual(StaffStrings.inviting, "Invitando...")
        XCTAssertEqual(StaffStrings.inviteLinkTitle, "Link de invitación")
        XCTAssertEqual(StaffStrings.copyInviteLink, "Copiar link")
        XCTAssertEqual(StaffStrings.inviteLinkCopied, "Link copiado")
        XCTAssertEqual(StaffStrings.inviteCreated, "Invitación creada correctamente")
        XCTAssertEqual(StaffStrings.inviteCreateError, "No se pudo crear la invitación")
        XCTAssertEqual(StaffStrings.invitePendingActive, "Hay una invitación activa pendiente.")
        XCTAssertEqual(StaffStrings.inviteEmailRequired, "Este colaborador necesita email para activar acceso")
        XCTAssertEqual(StaffStrings.inviteAlreadyActivated, "Este colaborador ya tiene acceso activado")
        XCTAssertEqual(StaffStrings.revokeInvite, "Revocar invitación")
        XCTAssertEqual(StaffStrings.revoking, "Revocando...")
        XCTAssertEqual(StaffStrings.revokeConfirmTitle, "Revocar invitación")
        XCTAssertEqual(StaffStrings.revokeConfirmMessage, "La invitación quedará desactivada y el enlace dejará de funcionar.")
        XCTAssertEqual(StaffStrings.inviteRevoked, "Invitación revocada")
        XCTAssertEqual(StaffStrings.inviteRevokeError, "No se pudo revocar la invitación")

        // Staff Form
        XCTAssertEqual(StaffStrings.editTitle, "Editar Personal")
        XCTAssertEqual(StaffStrings.newTitle, "Nuevo Personal")
        XCTAssertEqual(StaffStrings.sectionInfo, "Información")
        XCTAssertEqual(StaffStrings.fieldName, "Nombre")
        XCTAssertEqual(StaffStrings.fieldNamePlaceholder, "Nombre completo")
        XCTAssertEqual(StaffStrings.nameMinError, "Mínimo 2 caracteres")
        XCTAssertEqual(StaffStrings.fieldRole, "Rol")
        XCTAssertEqual(StaffStrings.fieldRolePlaceholder, "Ej: Mesero, DJ, Fotógrafo")
        XCTAssertEqual(StaffStrings.sectionContact, "Contacto")
        XCTAssertEqual(StaffStrings.fieldPhone, "Teléfono")
        XCTAssertEqual(StaffStrings.fieldPhonePlaceholder, "10 dígitos")
        XCTAssertEqual(StaffStrings.fieldEmail, "Email")
        XCTAssertEqual(StaffStrings.fieldEmailPlaceholder, "correo@ejemplo.com")
        XCTAssertEqual(StaffStrings.emailInvalidError, "Email inválido")
        XCTAssertEqual(StaffStrings.sectionNotif, "Avisos")
        XCTAssertEqual(StaffStrings.notifToggleLabel, "Avisarle por email al asignarlo a un evento")
        XCTAssertEqual(StaffStrings.notifToggleSubtitle, "Se activará en Phase 2 (Pro+). Por ahora guardamos la preferencia.")
        XCTAssertEqual(StaffStrings.notifEmailRequired, "Para activar el aviso necesitás un email válido")
        XCTAssertEqual(StaffStrings.sectionNotes, "Notas")

        // Teams List
        XCTAssertEqual(StaffStrings.teamsTitle, "Equipos")
        XCTAssertEqual(StaffStrings.teamsSearchPrompt, "Buscar equipos")
        XCTAssertEqual(StaffStrings.teamsAddAccessibility, "Crear equipo")
        XCTAssertEqual(StaffStrings.teamDeleteTitle, "Eliminar equipo")
        XCTAssertEqual(StaffStrings.teamsLoading, "Cargando equipos...")
        XCTAssertEqual(StaffStrings.teamsEmptyTitle, "Sin equipos todavía")
        XCTAssertEqual(StaffStrings.teamsEmptyMessage, "Agrupá a tu equipo de meseros o fotógrafos para asignarlos a un evento con un solo toque.")
        XCTAssertEqual(StaffStrings.teamsEmptyAction, "Crear equipo")
        XCTAssertEqual(StaffStrings.teamsFilteredEmptyMessage, "No encontramos equipos que coincidan con tu búsqueda")
        XCTAssertEqual(StaffStrings.teamDeleteMessage("Meseros"), "Se eliminará el equipo Meseros. Los colaboradores individuales no se borran.")

        // Teams Detail
        XCTAssertEqual(StaffStrings.teamsLoadingDetail, "Cargando equipo...")
        XCTAssertEqual(StaffStrings.teamNotFoundMessage, "No se pudo cargar el equipo")
        XCTAssertEqual(StaffStrings.teamNavFallback, "Equipo")
        XCTAssertEqual(StaffStrings.teamDeleteError, "Error al eliminar el equipo")
        XCTAssertEqual(StaffStrings.teamEmptyMembers, "Este equipo todavía no tiene miembros. Editalo para agregarlos.")
        XCTAssertEqual(StaffStrings.memberNoName, "(sin nombre)")
        XCTAssertEqual(StaffStrings.memberLeadAccessibility, "Lidera el equipo")
        XCTAssertEqual(StaffStrings.memberCount(1), "1 miembro")
        XCTAssertEqual(StaffStrings.memberCount(4), "4 miembros")

        // Teams Form
        XCTAssertEqual(StaffStrings.teamEditTitle, "Editar Equipo")
        XCTAssertEqual(StaffStrings.teamNewTitle, "Nuevo Equipo")
        XCTAssertEqual(StaffStrings.teamNamePlaceholder, "Ej: Cuadrilla de meseros A")
        XCTAssertEqual(StaffStrings.teamNameError, "El nombre es obligatorio (max 255)")
        XCTAssertEqual(StaffStrings.teamRoleLabel, "Rol del equipo (opcional)")
        XCTAssertEqual(StaffStrings.teamRolePlaceholder, "Ej: Meseros, Fotografía")
        XCTAssertEqual(StaffStrings.teamNotesLabel, "Notas internas")
        XCTAssertEqual(StaffStrings.addMember, "Agregar miembro")
        XCTAssertEqual(StaffStrings.removeLead, "Quitar liderazgo")
        XCTAssertEqual(StaffStrings.setLead, "Marcar como líder")
        XCTAssertEqual(StaffStrings.membersFooter, "Ordenalos como deberían aparecer al asignar el equipo a un evento. El líder se marca con la corona.")
        XCTAssertEqual(StaffStrings.pickerEmptyMessage, "Agrega colaboradores en la sección Personal antes de armar equipos")
        XCTAssertEqual(StaffStrings.pickerTitle, "Agregar miembro")
    }

    func testStaffStringsResolveForEnglish() {
        UserDefaults.standard.set("en-US", forKey: "preferredLocale")
        
        // Shared
        XCTAssertEqual(StaffStrings.cancel, "Cancel")
        XCTAssertEqual(StaffStrings.edit, "Edit")
        XCTAssertEqual(StaffStrings.save, "Save")
        XCTAssertEqual(StaffStrings.close, "Close")
        XCTAssertEqual(StaffStrings.loading, "Loading...")
        XCTAssertEqual(StaffStrings.errorTitle, "Error")
        XCTAssertEqual(StaffStrings.retry, "Retry")
        XCTAssertEqual(StaffStrings.errorLoadingTitle, "Loading error")
        XCTAssertEqual(StaffStrings.filteredEmptyTitle, "No results")
        XCTAssertEqual(StaffStrings.unexpectedError, "An unexpected error occurred.")
        XCTAssertEqual(StaffStrings.unexpectedErrorRetry, "An unexpected error occurred. Try again.")
        XCTAssertEqual(StaffStrings.notesTitle, "Notes")
        XCTAssertEqual(StaffStrings.membersTitle, "Members")
        XCTAssertEqual(StaffStrings.deleteAction, "Delete")
        XCTAssertEqual(StaffStrings.callAction, "Call")

        // Sort
        XCTAssertEqual(StaffStrings.sortTitle, "Sort by")
        XCTAssertEqual(StaffStrings.sortName, "Name")
        XCTAssertEqual(StaffStrings.sortRole, "Role")
        XCTAssertEqual(StaffStrings.sortCreatedAt, "Created date")
        XCTAssertEqual(StaffStrings.sortAscending, "Ascending")
        XCTAssertEqual(StaffStrings.sortDescending, "Descending")
        XCTAssertEqual(StaffStrings.sortAccessibility, "Sort staff")

        // Staff List
        XCTAssertEqual(StaffStrings.title, "Staff")
        XCTAssertEqual(StaffStrings.searchPrompt, "Search staff")
        XCTAssertEqual(StaffStrings.addAccessibility, "Add staff member")
        XCTAssertEqual(StaffStrings.emptyTitle, "No staff yet")
        XCTAssertEqual(StaffStrings.emptyMessage, "Add your first staff member to assign them to events")
        XCTAssertEqual(StaffStrings.emptyAction, "Add Staff")
        XCTAssertEqual(StaffStrings.filteredEmptyMessage, "No staff members matched your search")
        XCTAssertEqual(StaffStrings.teamsLinkTitle, "Teams")
        XCTAssertEqual(StaffStrings.teamsLinkSubtitle, "Group your crew to assign them with a single tap")

        // Staff Delete
        XCTAssertEqual(StaffStrings.deleteTitle, "Delete staff member")
        XCTAssertEqual(StaffStrings.deletedToast("Juan"), "Juan deleted")
        XCTAssertEqual(StaffStrings.deleteMessage("Juan"), "Remove Juan? You can undo this for a few seconds.")
        XCTAssertEqual(StaffStrings.deleteConfirmMessage("Juan"), "Are you sure you want to delete Juan? This action cannot be undone.")

        // Staff Detail
        XCTAssertEqual(StaffStrings.loadingStaff, "Loading staff member...")
        XCTAssertEqual(StaffStrings.notFoundMessage, "Could not load staff member")
        XCTAssertEqual(StaffStrings.navTitleFallback, "Staff member")
        XCTAssertEqual(StaffStrings.deleteError, "Failed to delete staff member")
        XCTAssertEqual(StaffStrings.emailNotifTitle, "Email notifications enabled")
        XCTAssertEqual(StaffStrings.emailNotifSubtitle, "Will be activated in Phase 2 (Pro+). Preference is saved.")
        XCTAssertEqual(StaffStrings.inviteAccess, "Invite access")
        XCTAssertEqual(StaffStrings.inviting, "Inviting...")
        XCTAssertEqual(StaffStrings.inviteLinkTitle, "Invite link")
        XCTAssertEqual(StaffStrings.copyInviteLink, "Copy link")
        XCTAssertEqual(StaffStrings.inviteLinkCopied, "Invite link copied")
        XCTAssertEqual(StaffStrings.inviteCreated, "Invite created successfully")
        XCTAssertEqual(StaffStrings.inviteCreateError, "Could not create invite")
        XCTAssertEqual(StaffStrings.invitePendingActive, "There is an active pending invite.")
        XCTAssertEqual(StaffStrings.inviteEmailRequired, "This staff member needs an email to activate access")
        XCTAssertEqual(StaffStrings.inviteAlreadyActivated, "This staff member already has activated access")
        XCTAssertEqual(StaffStrings.revokeInvite, "Revoke invite")
        XCTAssertEqual(StaffStrings.revoking, "Revoking...")
        XCTAssertEqual(StaffStrings.revokeConfirmTitle, "Revoke invite")
        XCTAssertEqual(StaffStrings.revokeConfirmMessage, "The invite will be deactivated and the link will stop working.")
        XCTAssertEqual(StaffStrings.inviteRevoked, "Invite revoked")
        XCTAssertEqual(StaffStrings.inviteRevokeError, "Could not revoke invite")

        // Staff Form
        XCTAssertEqual(StaffStrings.editTitle, "Edit Staff")
        XCTAssertEqual(StaffStrings.newTitle, "New Staff")
        XCTAssertEqual(StaffStrings.sectionInfo, "Information")
        XCTAssertEqual(StaffStrings.fieldName, "Name")
        XCTAssertEqual(StaffStrings.fieldNamePlaceholder, "Full name")
        XCTAssertEqual(StaffStrings.nameMinError, "Minimum 2 characters")
        XCTAssertEqual(StaffStrings.fieldRole, "Role")
        XCTAssertEqual(StaffStrings.fieldRolePlaceholder, "Ex: Waiter, DJ, Photographer")
        XCTAssertEqual(StaffStrings.sectionContact, "Contact")
        XCTAssertEqual(StaffStrings.fieldPhone, "Phone")
        XCTAssertEqual(StaffStrings.fieldPhonePlaceholder, "10 digits")
        XCTAssertEqual(StaffStrings.fieldEmail, "Email")
        XCTAssertEqual(StaffStrings.fieldEmailPlaceholder, "email@example.com")
        XCTAssertEqual(StaffStrings.emailInvalidError, "Invalid email")
        XCTAssertEqual(StaffStrings.sectionNotif, "Notifications")
        XCTAssertEqual(StaffStrings.notifToggleLabel, "Notify them by email when assigned to an event")
        XCTAssertEqual(StaffStrings.notifToggleSubtitle, "Will be activated in Phase 2 (Pro+). Preference is saved.")
        XCTAssertEqual(StaffStrings.notifEmailRequired, "A valid email is required to enable notifications")
        XCTAssertEqual(StaffStrings.sectionNotes, "Notes")

        // Teams List
        XCTAssertEqual(StaffStrings.teamsTitle, "Teams")
        XCTAssertEqual(StaffStrings.teamsSearchPrompt, "Search teams")
        XCTAssertEqual(StaffStrings.teamsAddAccessibility, "Create team")
        XCTAssertEqual(StaffStrings.teamDeleteTitle, "Delete team")
        XCTAssertEqual(StaffStrings.teamsLoading, "Loading teams...")
        XCTAssertEqual(StaffStrings.teamsEmptyTitle, "No teams yet")
        XCTAssertEqual(StaffStrings.teamsEmptyMessage, "Group your waiters or photographers to assign them to an event with a single tap.")
        XCTAssertEqual(StaffStrings.teamsEmptyAction, "Create team")
        XCTAssertEqual(StaffStrings.teamsFilteredEmptyMessage, "No teams matched your search")
        XCTAssertEqual(StaffStrings.teamDeleteMessage("Meseros"), "The team Meseros will be deleted. Individual members will not be removed.")

        // Teams Detail
        XCTAssertEqual(StaffStrings.teamsLoadingDetail, "Loading team...")
        XCTAssertEqual(StaffStrings.teamNotFoundMessage, "Could not load team")
        XCTAssertEqual(StaffStrings.teamNavFallback, "Team")
        XCTAssertEqual(StaffStrings.teamDeleteError, "Failed to delete team")
        XCTAssertEqual(StaffStrings.teamEmptyMembers, "This team has no members yet. Edit it to add some.")
        XCTAssertEqual(StaffStrings.memberNoName, "(no name)")
        XCTAssertEqual(StaffStrings.memberLeadAccessibility, "Team lead")
        XCTAssertEqual(StaffStrings.memberCount(1), "1 member")
        XCTAssertEqual(StaffStrings.memberCount(4), "4 members")

        // Teams Form
        XCTAssertEqual(StaffStrings.teamEditTitle, "Edit Team")
        XCTAssertEqual(StaffStrings.teamNewTitle, "New Team")
        XCTAssertEqual(StaffStrings.teamNamePlaceholder, "Ex: Waiter Crew A")
        XCTAssertEqual(StaffStrings.teamNameError, "Name is required (max 255)")
        XCTAssertEqual(StaffStrings.teamRoleLabel, "Team role (optional)")
        XCTAssertEqual(StaffStrings.teamRolePlaceholder, "Ex: Waiters, Photography")
        XCTAssertEqual(StaffStrings.teamNotesLabel, "Internal notes")
        XCTAssertEqual(StaffStrings.addMember, "Add member")
        XCTAssertEqual(StaffStrings.removeLead, "Remove as lead")
        XCTAssertEqual(StaffStrings.setLead, "Mark as lead")
        XCTAssertEqual(StaffStrings.membersFooter, "Order them as they should appear when assigning the team to an event. The lead is marked with the crown.")
        XCTAssertEqual(StaffStrings.pickerEmptyMessage, "Add staff members in the Staff section before building teams")
        XCTAssertEqual(StaffStrings.pickerTitle, "Add member")
    }
}
