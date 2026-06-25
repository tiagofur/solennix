import Foundation

// MARK: - Staff Strings

enum StaffStrings {
    // MARK: - Shared

    static var cancel: String { FeatureL10n.text("staff.shared.cancel", "Cancelar") }
    static var edit: String { FeatureL10n.text("staff.shared.edit", "Editar") }
    static var save: String { FeatureL10n.text("staff.shared.save", "Guardar") }
    static var close: String { FeatureL10n.text("staff.shared.close", "Cerrar") }
    static var loading: String { FeatureL10n.text("staff.shared.loading", "Cargando...") }
    static var errorTitle: String { FeatureL10n.text("staff.shared.error_title", "Error") }
    static var retry: String { FeatureL10n.text("staff.shared.retry", "Reintentar") }
    static var errorLoadingTitle: String { FeatureL10n.text("staff.shared.error_loading_title", "Error al cargar") }
    static var filteredEmptyTitle: String { FeatureL10n.text("staff.shared.filtered_empty_title", "Sin resultados") }
    static var unexpectedError: String { FeatureL10n.text("staff.shared.unexpected_error", "Ocurrió un error inesperado.") }
    static var unexpectedErrorRetry: String { FeatureL10n.text("staff.shared.unexpected_error_retry", "Ocurrió un error inesperado. Intentá de nuevo.") }
    static var notesTitle: String { FeatureL10n.text("staff.shared.notes_title", "Notas") }
    static var membersTitle: String { FeatureL10n.text("staff.shared.members_title", "Miembros") }
    static var deleteAction: String { FeatureL10n.text("staff.shared.delete_action", "Eliminar") }
    static var callAction: String { FeatureL10n.text("staff.shared.call_action", "Llamar") }
    static var emailAction: String { FeatureL10n.text("staff.shared.email_action", "Email") }

    // MARK: - Sort

    static var sortTitle: String { FeatureL10n.text("staff.sort.title", "Ordenar por") }
    static var sortName: String { FeatureL10n.text("staff.sort.name", "Nombre") }
    static var sortRole: String { FeatureL10n.text("staff.sort.role", "Rol") }
    static var sortCreatedAt: String { FeatureL10n.text("staff.sort.created_at", "Fecha de creación") }
    static var sortAscending: String { FeatureL10n.text("staff.sort.ascending", "Ascendente") }
    static var sortDescending: String { FeatureL10n.text("staff.sort.descending", "Descendente") }
    static var sortAccessibility: String { FeatureL10n.text("staff.sort.accessibility", "Ordenar personal") }

    // MARK: - Staff List

    static var title: String { FeatureL10n.text("staff.list.title", "Personal") }
    static var searchPrompt: String { FeatureL10n.text("staff.list.search_prompt", "Buscar personal") }
    static var addAccessibility: String { FeatureL10n.text("staff.list.add_accessibility", "Agregar personal") }
    static var emptyTitle: String { FeatureL10n.text("staff.list.empty_title", "Sin personal") }
    static var emptyMessage: String { FeatureL10n.text("staff.list.empty_message", "Agregá a tu primer colaborador para asignarlo a eventos") }
    static var emptyAction: String { FeatureL10n.text("staff.list.empty_action", "Agregar Personal") }
    static var filteredEmptyMessage: String { FeatureL10n.text("staff.list.filtered_empty_message", "No se encontró personal que coincida con tu búsqueda") }
    static var teamsLinkTitle: String { FeatureL10n.text("staff.list.teams_link_title", "Equipos") }
    static var teamsLinkSubtitle: String { FeatureL10n.text("staff.list.teams_link_subtitle", "Armá cuadrillas para asignarlas de un toque") }

    // MARK: - Staff Delete

    static var deleteTitle: String { FeatureL10n.text("staff.delete.delete_title", "Eliminar personal") }

    static func deletedToast(_ name: String) -> String {
        FeatureL10n.format("staff.delete.deleted_toast", "%@ eliminado", name)
    }

    static func deleteMessage(_ name: String) -> String {
        FeatureL10n.format("staff.delete.delete_message", "Se eliminará a %@. Podrás deshacer durante unos segundos.", name)
    }

    // MARK: - Staff Detail

    static var loadingStaff: String { FeatureL10n.text("staff.detail.loading_staff", "Cargando personal...") }
    static var notFoundMessage: String { FeatureL10n.text("staff.detail.not_found_message", "No se pudo cargar el personal") }
    static var navTitleFallback: String { FeatureL10n.text("staff.detail.nav_title_fallback", "Personal") }
    static var deleteError: String { FeatureL10n.text("staff.detail.delete_error", "Error al eliminar el personal") }
    static var moreActions: String { FeatureL10n.text("staff.detail.more_actions", "Acciones del personal") }
    static var emailNotifTitle: String { FeatureL10n.text("staff.detail.email_notif_title", "Avisos por email activados") }
    static var emailNotifSubtitle: String { FeatureL10n.text("staff.detail.email_notif_subtitle", "Se activará en Phase 2 (Pro+). Por ahora queda registrada la preferencia.") }
    static var inviteAccess: String { FeatureL10n.text("staff.detail.invite_access", "Invitar acceso") }
    static var inviting: String { FeatureL10n.text("staff.detail.inviting", "Invitando...") }
    static var inviteLinkTitle: String { FeatureL10n.text("staff.detail.invite_link_title", "Link de invitación") }
    static var copyInviteLink: String { FeatureL10n.text("staff.detail.copy_invite_link", "Copiar link") }
    static var inviteLinkCopied: String { FeatureL10n.text("staff.detail.invite_link_copied", "Link copiado") }
    static var inviteCreated: String { FeatureL10n.text("staff.detail.invite_created", "Invitación creada correctamente") }
    static var inviteCreateError: String { FeatureL10n.text("staff.detail.invite_create_error", "No se pudo crear la invitación") }
    static var invitePendingActive: String { FeatureL10n.text("staff.detail.invite_pending_active", "Hay una invitación activa pendiente.") }
    static var inviteEmailRequired: String { FeatureL10n.text("staff.detail.invite_email_required", "Este colaborador necesita email para activar acceso") }
    static var inviteAlreadyActivated: String { FeatureL10n.text("staff.detail.invite_already_activated", "Este colaborador ya tiene acceso activado") }
    static var revokeInvite: String { FeatureL10n.text("staff.detail.revoke_invite", "Revocar invitación") }
    static var revoking: String { FeatureL10n.text("staff.detail.revoking", "Revocando...") }
    static var revokeConfirmTitle: String { FeatureL10n.text("staff.detail.revoke_confirm_title", "Revocar invitación") }
    static var revokeConfirmMessage: String { FeatureL10n.text("staff.detail.revoke_confirm_message", "La invitación quedará desactivada y el enlace dejará de funcionar.") }
    static var inviteRevoked: String { FeatureL10n.text("staff.detail.invite_revoked", "Invitación revocada") }
    static var inviteRevokeError: String { FeatureL10n.text("staff.detail.invite_revoke_error", "No se pudo revocar la invitación") }

    static func deleteConfirmMessage(_ name: String) -> String {
        FeatureL10n.format("staff.delete.delete_confirm_message", "¿Estás seguro de que querés eliminar a %@? Esta acción no se puede deshacer.", name)
    }

    // MARK: - Staff Form

    static var editTitle: String { FeatureL10n.text("staff.form.edit_title", "Editar Personal") }
    static var newTitle: String { FeatureL10n.text("staff.form.new_title", "Nuevo Personal") }
    static var sectionInfo: String { FeatureL10n.text("staff.form.section_info", "Información") }
    static var fieldName: String { FeatureL10n.text("staff.form.field_name", "Nombre") }
    static var fieldNamePlaceholder: String { FeatureL10n.text("staff.form.field_name_placeholder", "Nombre completo") }
    static var nameMinError: String { FeatureL10n.text("staff.form.name_min_error", "Mínimo 2 caracteres") }
    static var fieldRole: String { FeatureL10n.text("staff.form.field_role", "Rol") }
    static var fieldRolePlaceholder: String { FeatureL10n.text("staff.form.field_role_placeholder", "Ej: Mesero, DJ, Fotógrafo") }
    static var sectionContact: String { FeatureL10n.text("staff.form.section_contact", "Contacto") }
    static var fieldPhone: String { FeatureL10n.text("staff.form.field_phone", "Teléfono") }
    static var fieldPhonePlaceholder: String { FeatureL10n.text("staff.form.field_phone_placeholder", "10 dígitos") }
    static var fieldEmail: String { FeatureL10n.text("staff.form.field_email", "Email") }
    static var fieldEmailPlaceholder: String { FeatureL10n.text("staff.form.field_email_placeholder", "correo@ejemplo.com") }
    static var emailInvalidError: String { FeatureL10n.text("staff.form.email_invalid_error", "Email inválido") }
    static var sectionNotif: String { FeatureL10n.text("staff.form.section_notif", "Avisos") }
    static var notifToggleLabel: String { FeatureL10n.text("staff.form.notif_toggle_label", "Avisarle por email al asignarlo a un evento") }
    static var notifToggleSubtitle: String { FeatureL10n.text("staff.form.notif_toggle_subtitle", "Se activará en Phase 2 (Pro+). Por ahora guardamos la preferencia.") }
    static var notifEmailRequired: String { FeatureL10n.text("staff.form.notif_email_required", "Para activar el aviso necesitás un email válido") }
    static var sectionNotes: String { FeatureL10n.text("staff.form.section_notes", "Notas") }
    static var validationNameMin: String { FeatureL10n.text("staff.form.validation.name_min", "El nombre debe tener al menos 2 caracteres") }
    static var validationEmailInvalid: String { FeatureL10n.text("staff.form.validation.email_invalid", "El email no parece válido") }
    static var validationOptInEmailRequired: String { FeatureL10n.text("staff.form.validation.opt_in_email_required", "Para activar el aviso por email necesitás un email válido") }
    static var discardChangesTitle: String { FeatureL10n.text("common.discard_changes.title", "¿Descartar cambios?") }
    static var discardChangesConfirm: String { FeatureL10n.text("common.discard_changes.confirm", "Descartar") }
    static var discardChangesCancel: String { FeatureL10n.text("common.discard_changes.cancel", "Cancelar") }

    // MARK: - Teams List

    static var teamsTitle: String { FeatureL10n.text("staff.teams.teams_title", "Equipos") }
    static var teamsSearchPrompt: String { FeatureL10n.text("staff.teams.teams_search_prompt", "Buscar equipos") }
    static var teamsAddAccessibility: String { FeatureL10n.text("staff.teams.teams_add_accessibility", "Crear equipo") }
    static var teamDeleteTitle: String { FeatureL10n.text("staff.teams.team_delete_title", "Eliminar equipo") }
    static var teamsLoading: String { FeatureL10n.text("staff.teams.teams_loading", "Cargando equipos...") }
    static var teamsEmptyTitle: String { FeatureL10n.text("staff.teams.teams_empty_title", "Sin equipos todavía") }
    static var teamsEmptyMessage: String { FeatureL10n.text("staff.teams.teams_empty_message", "Agrupá a tu equipo de meseros o fotógrafos para asignarlos a un evento con un solo toque.") }
    static var teamsEmptyAction: String { FeatureL10n.text("staff.teams.teams_empty_action", "Crear equipo") }
    static var teamsFilteredEmptyMessage: String { FeatureL10n.text("staff.teams.teams_filtered_empty_message", "No encontramos equipos que coincidan con tu búsqueda") }

    static func teamDeleteMessage(_ name: String) -> String {
        FeatureL10n.format("staff.teams.team_delete_message", "Se eliminará el equipo %@. Los colaboradores individuales no se borran.", name)
    }

    static func teamDeletedToast(_ name: String) -> String {
        FeatureL10n.format("staff.teams.team_deleted_toast", "Equipo %@ eliminado", name)
    }

    // MARK: - Teams Detail

    static var teamsLoadingDetail: String { FeatureL10n.text("staff.teams_detail.teams_loading_detail", "Cargando equipo...") }
    static var teamNotFoundMessage: String { FeatureL10n.text("staff.teams_detail.team_not_found_message", "No se pudo cargar el equipo") }
    static var teamNavFallback: String { FeatureL10n.text("staff.teams_detail.team_nav_fallback", "Equipo") }
    static var teamDeleteError: String { FeatureL10n.text("staff.teams_detail.team_delete_error", "Error al eliminar el equipo") }
    static var teamEmptyMembers: String { FeatureL10n.text("staff.teams_detail.team_empty_members", "Este equipo todavía no tiene miembros. Editalo para agregarlos.") }
    static var memberNoName: String { FeatureL10n.text("staff.teams_detail.member_no_name", "(sin nombre)") }
    static var memberLeadAccessibility: String { FeatureL10n.text("staff.teams_detail.member_lead_accessibility", "Lidera el equipo") }

    static func memberCount(_ count: Int) -> String {
        if count == 1 {
            return FeatureL10n.text("staff.teams_detail.member_count_singular", "1 miembro")
        } else {
            return FeatureL10n.format("staff.teams_detail.member_count_plural", "%lld miembros", count)
        }
    }

    // MARK: - Teams Form

    static var teamEditTitle: String { FeatureL10n.text("staff.teams_form.team_edit_title", "Editar Equipo") }
    static var teamNewTitle: String { FeatureL10n.text("staff.teams_form.team_new_title", "Nuevo Equipo") }
    static var teamNamePlaceholder: String { FeatureL10n.text("staff.teams_form.team_name_placeholder", "Ej: Cuadrilla de meseros A") }
    static var teamNameError: String { FeatureL10n.text("staff.teams_form.team_name_error", "El nombre es obligatorio (max 255)") }
    static var validationTeamNameRequired: String { FeatureL10n.text("staff.teams_form.validation.name_required", "El nombre es obligatorio") }
    static var teamRoleLabel: String { FeatureL10n.text("staff.teams_form.team_role_label", "Rol del equipo (opcional)") }
    static var teamRolePlaceholder: String { FeatureL10n.text("staff.teams_form.team_role_placeholder", "Ej: Meseros, Fotografía") }
    static var teamNotesLabel: String { FeatureL10n.text("staff.teams_form.team_notes_label", "Notas internas") }
    static var addMember: String { FeatureL10n.text("staff.teams_form.add_member", "Agregar miembro") }
    static var removeLead: String { FeatureL10n.text("staff.teams_form.remove_lead", "Quitar liderazgo") }
    static var setLead: String { FeatureL10n.text("staff.teams_form.set_lead", "Marcar como líder") }
    static var membersFooter: String { FeatureL10n.text("staff.teams_form.members_footer", "Ordenalos como deberían aparecer al asignar el equipo a un evento. El líder se marca con la corona.") }
    static var pickerEmptyMessage: String { FeatureL10n.text("staff.teams_form.picker_empty_message", "Agrega colaboradores en la sección Personal antes de armar equipos") }
    static var pickerTitle: String { FeatureL10n.text("staff.teams_form.picker_title", "Agregar miembro") }
}
