import Foundation

enum CommonStrings {
    // Tips
    static var newEventTipTitle: String { FeatureL10n.text("common.tip.new_event.title", "Crear un Evento") }
    static var newEventTipMessage: String { FeatureL10n.text("common.tip.new_event.message", "Toca aquí para iniciar la creación de un nuevo evento, cotización o contrato.") }
    static var quickQuoteTipMessage: String { FeatureL10n.text("common.tip.quick_quote.message", "Usa esta herramienta para generar un presupuesto en el momento sin necesidad de crear el cliente primero.") }
    static var swipeActionTipTitle: String { FeatureL10n.text("common.tip.swipe_action.title", "Acciones Rápidas") }
    static var swipeActionTipMessage: String { FeatureL10n.text("common.tip.swipe_action.message", "Desliza los elementos de la lista hacia la izquierda o derecha para ver más opciones como editar, eliminar o llamar.") }
    
    // FAB
    static var newEventLabel: String { FeatureL10n.text("common.fab.new_event", "Nuevo Evento") }
    
    // Paywall
    static var paywallTitle: String { FeatureL10n.text("common.paywall.title", "Límite alcanzado") }
    static var paywallUpgradeButton: String { FeatureL10n.text("common.paywall.upgrade_button", "Ver planes") }
    static var paywallDismissButton: String { FeatureL10n.text("common.paywall.dismiss_button", "Cerrar") }
    
    // Payment Entry Sheet
    static var paymentEntryDefaultTitle: String { FeatureL10n.text("common.payment_entry.default_title", "Registrar Pago") }
    static var paymentEntryDefaultConfirm: String { FeatureL10n.text("common.payment_entry.default_confirm", "Guardar Pago") }
    static var paymentEntryAmountLabel: String { FeatureL10n.text("common.payment_entry.amount_label", "Monto") }
    static var paymentEntryMethodLabel: String { FeatureL10n.text("common.payment_entry.method_label", "Método de pago") }
    static var paymentEntryNotesLabel: String { FeatureL10n.text("common.payment_entry.notes_label", "Notas (opcional)") }
    static var paymentEntryNotesPlaceholder: String { FeatureL10n.text("common.payment_entry.notes_placeholder", "Notas del pago") }
    static var paymentEntryCancelButton: String { FeatureL10n.text("common.payment_entry.cancel_button", "Cancelar") }
    
    // Payment Methods
    static var paymentMethodCash: String { FeatureL10n.text("common.payment_method.cash", "Efectivo") }
    static var paymentMethodTransfer: String { FeatureL10n.text("common.payment_method.transfer", "Transferencia") }
    static var paymentMethodCard: String { FeatureL10n.text("common.payment_method.card", "Tarjeta") }
    static var paymentMethodCheck: String { FeatureL10n.text("common.payment_method.check", "Cheque") }
}
