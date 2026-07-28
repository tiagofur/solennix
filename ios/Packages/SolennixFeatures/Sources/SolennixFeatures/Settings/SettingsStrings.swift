import Foundation

// MARK: - Settings Strings

enum SettingsStrings {
    // MARK: - General / Theme
    static var title: String { FeatureL10n.text("settings.title", "Ajustes") }
    static var themeSystemDefault: String { FeatureL10n.text("settings.theme.system_default", "Predeterminado del sistema") }
    static var themeLight: String { FeatureL10n.text("settings.theme.light", "Claro") }
    static var themeDark: String { FeatureL10n.text("settings.theme.dark", "Oscuro") }
    static var themeLabel: String { FeatureL10n.text("settings.theme.label", "Tema") }

    // MARK: - Sections
    static var sectionAppearance: String { FeatureL10n.text("settings.section.appearance", "Apariencia") }
    static var sectionAccount: String { FeatureL10n.text("settings.section.account", "Cuenta") }
    static var sectionSubscription: String { FeatureL10n.text("settings.section.subscription", "Suscripción") }
    static var sectionBusiness: String { FeatureL10n.text("settings.section.business", "Negocio") }
    static var sectionLegal: String { FeatureL10n.text("settings.section.legal", "Legal") }
    static var version: String { FeatureL10n.text("settings.version", "Versión") }

    // MARK: - Actions
    static var actionLogout: String { FeatureL10n.text("settings.action.logout", "Cerrar sesión") }
    static var actionEditProfile: String { FeatureL10n.text("settings.action.edit_profile", "Editar perfil") }
    static var actionChangePassword: String { FeatureL10n.text("settings.action.change_password", "Cambiar contraseña") }
    static var tabNotifications: String { FeatureL10n.text("settings.tab.notifications", "Notificaciones") }
    static var tabCalendarSync: String { FeatureL10n.text("settings.tab.calendar_sync", "Sincronizar calendario") }
    static var actionManagePlan: String { FeatureL10n.text("settings.action.manage_plan", "Gestionar plan") }
    static var actionBusinessSettings: String { FeatureL10n.text("settings.action.business_settings", "Ajustes del negocio") }
    static var actionPublicProfile: String { FeatureL10n.text("settings.action.public_profile", "Perfil público") }
    static var actionContractDefaults: String { FeatureL10n.text("settings.action.contract_defaults", "Valores del contrato") }
    static var actionReviews: String { FeatureL10n.text("settings.action.reviews", "Reseñas de clientes") }
    static var actionHelp: String { FeatureL10n.text("settings.action.help", "Centro de ayuda") }
    static var actionAbout: String { FeatureL10n.text("settings.action.about", "Acerca de") }
    static var actionPrivacyPolicy: String { FeatureL10n.text("settings.action.privacy_policy", "Política de privacidad") }
    static var actionTermsConditions: String { FeatureL10n.text("settings.action.terms_conditions", "Términos y condiciones") }
    static var actionDeleteAccount: String { FeatureL10n.text("settings.action.delete_account", "Eliminar cuenta") }

    // MARK: - Hints
    static var legalHelpHint: String { FeatureL10n.text("settings.legal.help_hint", "Abre el centro de ayuda en Safari") }
    static var legalPrivacyHint: String { FeatureL10n.text("settings.legal.privacy_hint", "Abre la política de privacidad en Safari") }
    static var legalTermsHint: String { FeatureL10n.text("settings.legal.terms_hint", "Abre los términos de servicio en Safari") }
    static var logoutConfirmation: String { FeatureL10n.text("settings.logout.confirmation", "¿Estás seguro de que quieres cerrar sesión?") }

    // MARK: - Plans
    static var planBasic: String { FeatureL10n.text("settings.plan.basic", "Básico") }
    static var planPro: String { FeatureL10n.text("settings.plan.pro", "Pro") }
    static var planBusiness: String { FeatureL10n.text("settings.plan.business", "Business") }

    // MARK: - Account Deletion
    static var deleteAccountTitle: String { FeatureL10n.text("settings.delete_account.title", "Eliminar cuenta") }
    static var deleteAccountSubtitle: String { FeatureL10n.text("settings.delete_account.subtitle", "Eliminar tu cuenta permanentemente") }
    static var deleteAccountIntro: String { FeatureL10n.text("settings.delete_account.intro", "Entendemos que quieras eliminar tu cuenta. Por favor lee atentamente lo que sucederá a continuación.") }
    static var deleteAccountWhatHappensTitle: String { FeatureL10n.text("settings.delete_account.what_happens_title", "¿Qué sucederá con tu información?") }
    static var deleteAccountItemEvents: String { FeatureL10n.text("settings.delete_account.item_events", "Tus eventos, clientes y productos serán programados para eliminación permanente.") }
    static var deleteAccountItemSub: String { FeatureL10n.text("settings.delete_account.item_sub", "Tu suscripción se cancelará de manera inmediata y no recibirás nuevos cobros.") }
    static var deleteAccountItemLogs: String { FeatureL10n.text("settings.delete_account.item_logs", "Conservaremos ciertos registros de auditoría anonimizados por cumplimiento legal.") }
    static var deleteAccountGraceWarning: String { FeatureL10n.text("settings.delete_account.grace_warning", "Tu cuenta entrará en un período de gracia de 90 días. Durante este tiempo, tu información estará resguardada de forma segura y podrás revocar esta solicitud contactándote con soporte en caso de que cambies de opinión.") }
    static var deleteAccountConfirmCheckbox: String { FeatureL10n.text("settings.delete_account.confirm_checkbox", "Entiendo las consecuencias y confirmo que deseo programar la eliminación de mi cuenta.") }
    static var deleteAccountDeleting: String { FeatureL10n.text("settings.delete_account.deleting", "Programando...") }
    static var deleteAccountButton: String { FeatureL10n.text("settings.delete_account.button", "Programar eliminación") }
    static var deleteAccountSuccessTitle: String { FeatureL10n.text("settings.delete_account.success_title", "Eliminación programada") }
    static var deleteAccountSuccessMessage: String { FeatureL10n.text("settings.delete_account.success_message", "Tu cuenta ha sido programada para eliminación de forma exitosa. Se aplicará un período de gracia de 90 días. En instantes cerraremos tu sesión.") }
    static var deleteAccountLoggingOut: String { FeatureL10n.text("settings.delete_account.logging_out", "Cerrando sesión...") }

    // MARK: - Change Password
    static var passwordCurrentLabel: String { FeatureL10n.text("settings.password.current_label", "Contraseña actual") }
    static var passwordCurrentSection: String { FeatureL10n.text("settings.password.current_section", "Contraseña actual") }
    static var passwordNewLabel: String { FeatureL10n.text("settings.password.new_label", "Nueva contraseña") }
    static var passwordNewSection: String { FeatureL10n.text("settings.password.new_section", "Nueva contraseña") }
    static var passwordConfirmLabel: String { FeatureL10n.text("settings.password.confirm_label", "Confirmar contraseña") }
    static var passwordHint: String { FeatureL10n.text("settings.password.hint", "La contraseña debe tener al menos 8 caracteres.") }
    static var passwordSuccess: String { FeatureL10n.text("settings.password.success", "Contraseña actualizada correctamente") }

    // MARK: - Common
    static var commonCancel: String { FeatureL10n.text("common.cancel", "Cancelar") }
    static var commonSave: String { FeatureL10n.text("common.save", "Guardar") }
    static var commonErrorRetry: String { FeatureL10n.text("common.error.retry", "Ocurrió un error inesperado. Intenta de nuevo.") }
}
