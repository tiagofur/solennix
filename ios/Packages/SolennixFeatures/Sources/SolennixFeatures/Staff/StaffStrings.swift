import Foundation

// MARK: - Staff Strings

enum StaffStrings {
    private static var isEnglish: Bool { Locale.current.language.languageCode?.identifier == "en" }

    // MARK: - Shared

    static let cancel = isEnglish ? "Cancel" : "Cancelar"
    static let edit = isEnglish ? "Edit" : "Editar"
    static let save = isEnglish ? "Save" : "Guardar"
    static let close = isEnglish ? "Close" : "Cerrar"
    static let loading = isEnglish ? "Loading..." : "Cargando..."
    static let errorTitle = isEnglish ? "Error" : "Error"
    static let retry = isEnglish ? "Retry" : "Reintentar"
    static let errorLoadingTitle = isEnglish ? "Loading error" : "Error al cargar"
    static let filteredEmptyTitle = isEnglish ? "No results" : "Sin resultados"
    static let unexpectedError = isEnglish ? "An unexpected error occurred." : "Ocurrió un error inesperado."
    static let unexpectedErrorRetry = isEnglish ? "An unexpected error occurred. Try again." : "Ocurrió un error inesperado. Intentá de nuevo."
    static let notesTitle = isEnglish ? "Notes" : "Notas"
    static let membersTitle = isEnglish ? "Members" : "Miembros"
    static let deleteAction = isEnglish ? "Delete" : "Eliminar"
    static let callAction = isEnglish ? "Call" : "Llamar"

    // MARK: - Sort

    static let sortTitle = isEnglish ? "Sort by" : "Ordenar por"
    static let sortName = isEnglish ? "Name" : "Nombre"
    static let sortRole = isEnglish ? "Role" : "Rol"
    static let sortCreatedAt = isEnglish ? "Created date" : "Fecha de creación"
    static let sortAscending = isEnglish ? "Ascending" : "Ascendente"
    static let sortDescending = isEnglish ? "Descending" : "Descendente"
    static let sortAccessibility = isEnglish ? "Sort staff" : "Ordenar personal"

    // MARK: - Staff List

    static let title = isEnglish ? "Staff" : "Personal"
    static let searchPrompt = isEnglish ? "Search staff" : "Buscar personal"
    static let addAccessibility = isEnglish ? "Add staff member" : "Agregar personal"
    static let emptyTitle = isEnglish ? "No staff yet" : "Sin personal"
    static let emptyMessage = isEnglish ? "Add your first staff member to assign them to events" : "Agregá a tu primer colaborador para asignarlo a eventos"
    static let emptyAction = isEnglish ? "Add Staff" : "Agregar Personal"
    static let filteredEmptyMessage = isEnglish ? "No staff members matched your search" : "No se encontró personal que coincida con tu búsqueda"
    static let teamsLinkTitle = isEnglish ? "Teams" : "Equipos"
    static let teamsLinkSubtitle = isEnglish ? "Group your crew to assign them with a single tap" : "Armá cuadrillas para asignarlas de un toque"

    // MARK: - Staff Delete

    static let deleteTitle = isEnglish ? "Delete staff member" : "Eliminar personal"

    static func deletedToast(_ name: String) -> String {
        isEnglish ? "\(name) deleted" : "\(name) eliminado"
    }

    static func deleteMessage(_ name: String) -> String {
        isEnglish
            ? "Remove \(name)? You can undo this for a few seconds."
            : "Se eliminará a \(name). Podrás deshacer durante unos segundos."
    }

    // MARK: - Staff Detail

    static let loadingStaff = isEnglish ? "Loading staff member..." : "Cargando personal..."
    static let notFoundMessage = isEnglish ? "Could not load staff member" : "No se pudo cargar el personal"
    static let navTitleFallback = isEnglish ? "Staff member" : "Personal"
    static let deleteError = isEnglish ? "Failed to delete staff member" : "Error al eliminar el personal"
    static let emailNotifTitle = isEnglish ? "Email notifications enabled" : "Avisos por email activados"
    static let emailNotifSubtitle = isEnglish ? "Will be activated in Phase 2 (Pro+). Preference is saved." : "Se activará en Phase 2 (Pro+). Por ahora queda registrada la preferencia."

    static func deleteConfirmMessage(_ name: String) -> String {
        isEnglish
            ? "Are you sure you want to delete \(name)? This action cannot be undone."
            : "¿Estás seguro de que querés eliminar a \(name)? Esta acción no se puede deshacer."
    }

    // MARK: - Staff Form

    static let editTitle = isEnglish ? "Edit Staff" : "Editar Personal"
    static let newTitle = isEnglish ? "New Staff" : "Nuevo Personal"
    static let sectionInfo = isEnglish ? "Information" : "Información"
    static let fieldName = isEnglish ? "Name" : "Nombre"
    static let fieldNamePlaceholder = isEnglish ? "Full name" : "Nombre completo"
    static let nameMinError = isEnglish ? "Minimum 2 characters" : "Mínimo 2 caracteres"
    static let fieldRole = isEnglish ? "Role" : "Rol"
    static let fieldRolePlaceholder = isEnglish ? "Ex: Waiter, DJ, Photographer" : "Ej: Mesero, DJ, Fotógrafo"
    static let sectionContact = isEnglish ? "Contact" : "Contacto"
    static let fieldPhone = isEnglish ? "Phone" : "Teléfono"
    static let fieldPhonePlaceholder = isEnglish ? "10 digits" : "10 dígitos"
    static let fieldEmail = isEnglish ? "Email" : "Email"
    static let fieldEmailPlaceholder = isEnglish ? "email@example.com" : "correo@ejemplo.com"
    static let emailInvalidError = isEnglish ? "Invalid email" : "Email inválido"
    static let sectionNotif = isEnglish ? "Notifications" : "Avisos"
    static let notifToggleLabel = isEnglish ? "Notify them by email when assigned to an event" : "Avisarle por email al asignarlo a un evento"
    static let notifToggleSubtitle = isEnglish ? "Will be activated in Phase 2 (Pro+). Preference is saved." : "Se activará en Phase 2 (Pro+). Por ahora guardamos la preferencia."
    static let notifEmailRequired = isEnglish ? "A valid email is required to enable notifications" : "Para activar el aviso necesitás un email válido"
    static let sectionNotes = isEnglish ? "Notes" : "Notas"

    // MARK: - Teams List

    static let teamsTitle = isEnglish ? "Teams" : "Equipos"
    static let teamsSearchPrompt = isEnglish ? "Search teams" : "Buscar equipos"
    static let teamsAddAccessibility = isEnglish ? "Create team" : "Crear equipo"
    static let teamDeleteTitle = isEnglish ? "Delete team" : "Eliminar equipo"
    static let teamsLoading = isEnglish ? "Loading teams..." : "Cargando equipos..."
    static let teamsEmptyTitle = isEnglish ? "No teams yet" : "Sin equipos todavía"
    static let teamsEmptyMessage = isEnglish ? "Group your waiters or photographers to assign them to an event with a single tap." : "Agrupá a tu equipo de meseros o fotógrafos para asignarlos a un evento con un solo toque."
    static let teamsEmptyAction = isEnglish ? "Create team" : "Crear equipo"
    static let teamsFilteredEmptyMessage = isEnglish ? "No teams matched your search" : "No encontramos equipos que coincidan con tu búsqueda"

    static func teamDeleteMessage(_ name: String) -> String {
        isEnglish
            ? "The team \(name) will be deleted. Individual members will not be removed."
            : "Se eliminará el equipo \(name). Los colaboradores individuales no se borran."
    }

    // MARK: - Teams Detail

    static let teamsLoadingDetail = isEnglish ? "Loading team..." : "Cargando equipo..."
    static let teamNotFoundMessage = isEnglish ? "Could not load team" : "No se pudo cargar el equipo"
    static let teamNavFallback = isEnglish ? "Team" : "Equipo"
    static let teamDeleteError = isEnglish ? "Failed to delete team" : "Error al eliminar el equipo"
    static let teamEmptyMembers = isEnglish ? "This team has no members yet. Edit it to add some." : "Este equipo todavía no tiene miembros. Editalo para agregarlos."
    static let memberNoName = isEnglish ? "(no name)" : "(sin nombre)"
    static let memberLeadAccessibility = isEnglish ? "Team lead" : "Lidera el equipo"

    static func memberCount(_ count: Int) -> String {
        isEnglish
            ? (count == 1 ? "1 member" : "\(count) members")
            : (count == 1 ? "1 miembro" : "\(count) miembros")
    }

    // MARK: - Teams Form

    static let teamEditTitle = isEnglish ? "Edit Team" : "Editar Equipo"
    static let teamNewTitle = isEnglish ? "New Team" : "Nuevo Equipo"
    static let teamNamePlaceholder = isEnglish ? "Ex: Waiter Crew A" : "Ej: Cuadrilla de meseros A"
    static let teamNameError = isEnglish ? "Name is required (max 255)" : "El nombre es obligatorio (max 255)"
    static let teamRoleLabel = isEnglish ? "Team role (optional)" : "Rol del equipo (opcional)"
    static let teamRolePlaceholder = isEnglish ? "Ex: Waiters, Photography" : "Ej: Meseros, Fotografía"
    static let teamNotesLabel = isEnglish ? "Internal notes" : "Notas internas"
    static let addMember = isEnglish ? "Add member" : "Agregar miembro"
    static let removeLead = isEnglish ? "Remove as lead" : "Quitar liderazgo"
    static let setLead = isEnglish ? "Mark as lead" : "Marcar como líder"
    static let membersFooter = isEnglish ? "Order them as they should appear when assigning the team to an event. The lead is marked with the crown." : "Ordenalos como deberían aparecer al asignar el equipo a un evento. El líder se marca con la corona."
    static let pickerEmptyMessage = isEnglish ? "Add staff members in the Staff section before building teams" : "Agrega colaboradores en la sección Personal antes de armar equipos"
    static let pickerTitle = isEnglish ? "Add member" : "Agregar miembro"
}
