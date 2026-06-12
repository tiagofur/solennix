import Foundation

public enum CommonStrings {
    // Tips
    public static var newEventTipTitle: String { FeatureL10n.text("common.tip.new_event.title", "Crear un Evento") }
    public static var newEventTipMessage: String { FeatureL10n.text("common.tip.new_event.message", "Toca aquí para iniciar la creación de un nuevo evento, cotización o contrato.") }
    public static var quickQuoteTipMessage: String { FeatureL10n.text("common.tip.quick_quote.message", "Usa esta herramienta para generar un presupuesto en el momento sin necesidad de crear el cliente primero.") }
    public static var swipeActionTipTitle: String { FeatureL10n.text("common.tip.swipe_action.title", "Acciones Rápidas") }
    public static var swipeActionTipMessage: String { FeatureL10n.text("common.tip.swipe_action.message", "Desliza los elementos de la lista hacia la izquierda o derecha para ver más opciones como editar, eliminar o llamar.") }
    
    // FAB
    public static var newEventLabel: String { FeatureL10n.text("common.fab.new_event", "Nuevo Evento") }
    public static var fabExpandLabel: String { FeatureL10n.text("common.fab.expand_label", "Mostrar acciones rápidas") }
    public static var fabCollapseLabel: String { FeatureL10n.text("common.fab.collapse_label", "Ocultar acciones rápidas") }
    
    // Paywall
    public static var paywallTitle: String { FeatureL10n.text("common.paywall.title", "Límite alcanzado") }
    public static var paywallUpgradeButton: String { FeatureL10n.text("common.paywall.upgrade_button", "Ver planes") }
    public static var paywallDismissButton: String { FeatureL10n.text("common.paywall.dismiss_button", "Cerrar") }
    
    // Payment Entry Sheet
    public static var paymentEntryDefaultTitle: String { FeatureL10n.text("common.payment_entry.default_title", "Registrar Pago") }
    public static var paymentEntryDefaultConfirm: String { FeatureL10n.text("common.payment_entry.default_confirm", "Guardar Pago") }
    public static var paymentEntryAmountLabel: String { FeatureL10n.text("common.payment_entry.amount_label", "Monto") }
    public static var paymentEntryMethodLabel: String { FeatureL10n.text("common.payment_entry.method_label", "Método de pago") }
    public static var paymentEntryNotesLabel: String { FeatureL10n.text("common.payment_entry.notes_label", "Notas (opcional)") }
    public static var paymentEntryNotesPlaceholder: String { FeatureL10n.text("common.payment_entry.notes_placeholder", "Notas del pago") }
    public static var paymentEntryCancelButton: String { FeatureL10n.text("common.payment_entry.cancel_button", "Cancelar") }
    
    // Payment Methods
    public static var paymentMethodCash: String { FeatureL10n.text("common.payment_method.cash", "Efectivo") }
    public static var paymentMethodTransfer: String { FeatureL10n.text("common.payment_method.transfer", "Transferencia") }
    public static var paymentMethodCard: String { FeatureL10n.text("common.payment_method.card", "Tarjeta") }
    public static var paymentMethodCheck: String { FeatureL10n.text("common.payment_method.check", "Cheque") }
    
    // Navigation / Tabs
    public static var tabHome: String { FeatureL10n.text("common.tab.home", "Inicio") }
    public static var tabCalendar: String { FeatureL10n.text("common.tab.calendar", "Calendario") }
    public static var tabEvents: String { FeatureL10n.text("common.tab.events", "Eventos") }
    public static var tabClients: String { FeatureL10n.text("common.tab.clients", "Clientes") }
    public static var tabMore: String { FeatureL10n.text("common.tab.more", "Más") }
    public static var tabSearch: String { FeatureL10n.text("common.tab.search", "Buscar") }
    
    // Sidebar Sections
    public static var navPersonnel: String { FeatureL10n.text("common.nav.personnel", "Personal") }
    public static var navProducts: String { FeatureL10n.text("common.nav.products", "Productos") }
    public static var navInventory: String { FeatureL10n.text("common.nav.inventory", "Inventario") }
    public static var navPaymentInbox: String { FeatureL10n.text("common.nav.payment_inbox", "Pagos") }
    public static var navEventFormLinks: String { FeatureL10n.text("common.nav.event_form_links", "Formularios") }
    public static var navSettings: String { FeatureL10n.text("common.nav.settings", "Ajustes") }
    
    // More Menu Subtitles
    public static var moreMenuProductsSubtitle: String { FeatureL10n.text("common.more_menu.products_subtitle", "Catálogo y recetas") }
    public static var moreMenuInventorySubtitle: String { FeatureL10n.text("common.more_menu.inventory_subtitle", "Stock de ingredientes") }
    public static var moreMenuPaymentInboxSubtitle: String { FeatureL10n.text("common.more_menu.payment_inbox_subtitle", "Revisión de pagos de clientes") }
    public static var moreMenuEventFormLinksSubtitle: String { FeatureL10n.text("common.more_menu.event_form_links_subtitle", "Formularios para clientes nuevos") }
    public static var moreMenuPersonnelSubtitle: String { FeatureL10n.text("common.more_menu.personnel_subtitle", "Colaboradores y equipo") }
    public static var moreMenuSettingsSubtitle: String { FeatureL10n.text("common.more_menu.settings_subtitle", "Perfil, negocio, cuenta") }
    
    // Navigation Headers / Placeholders
    public static var navHeaderPrincipal: String { FeatureL10n.text("common.nav.header_principal", "Principal") }
    public static var navHeaderConfiguracion: String { FeatureL10n.text("common.nav.header_configuracion", "Configuración") }
    public static var navHeaderCatalogo: String { FeatureL10n.text("common.nav.header_catalogo", "Catálogo") }
    public static var globalSearchPrompt: String { FeatureL10n.text("common.nav.global_search_prompt", "Buscar clientes, eventos, productos o inventario...") }
    public static var sidebarSelectSectionTitle: String { FeatureL10n.text("common.nav.sidebar_select_section_title", "Selecciona una sección") }
    public static var sidebarSelectSectionDesc: String { FeatureL10n.text("common.nav.sidebar_select_section_desc", "Elige una sección del menú lateral.") }
}
