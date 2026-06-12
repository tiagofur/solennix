import Foundation

// MARK: - Payments Strings

enum PaymentsStrings {
    // MARK: - Search
    static var searchPrompt: String { FeatureL10n.text("payments.search_prompt", "Buscar por cliente...") }
    static var searchEmptyTitle: String { FeatureL10n.text("payments.search.empty_title", "Sin resultados") }
    static var searchEmptyMessage: String { FeatureL10n.text("payments.search.empty_message", "No se encontraron pagos que coincidan con tu búsqueda") }

    // MARK: - Navigation & Alerts
    static var title: String { FeatureL10n.text("payments.title", "Pagos recibidos") }
    static var errorTitle: String { FeatureL10n.text("payments.error_title", "Error") }
    static var errorOk: String { FeatureL10n.text("payments.error_ok", "OK") }

    // MARK: - Empty State
    static var emptyTitle: String { FeatureL10n.text("payments.empty_title", "Sin pagos pendientes") }
    static var emptyMessage: String { FeatureL10n.text("payments.empty_message", "Cuando tus clientes suban comprobantes de transferencia, los verás aquí para aprobar o rechazar.") }
    static var actionRefresh: String { FeatureL10n.text("payments.action_refresh", "Actualizar") }

    // MARK: - Plan Locked
    static var proOnlyTitle: String { FeatureL10n.text("payments.pro_only_title", "Función exclusiva para usuarios Pro.") }
    static var proOnlyMessage: String { FeatureL10n.text("payments.pro_only_message", "Actualiza tu plan para revisar y aprobar pagos recibidos de clientes.") }

    // MARK: - Submission Detail Sheet
    static var detailTitle: String { FeatureL10n.text("payments.detail_title", "Detalle de pago") }
    static var clientPlaceholder: String { FeatureL10n.text("payments.client_placeholder", "Cliente") }
    static var eventPlaceholder: String { FeatureL10n.text("payments.event_placeholder", "Evento") }
    static var receiptHeader: String { FeatureL10n.text("payments.receipt_header", "Comprobante") }
    static var receiptFallback: String { FeatureL10n.text("payments.receipt_fallback", "No se pudo previsualizar el archivo") }
    static var openReceipt: String { FeatureL10n.text("payments.action.open_receipt", "Abrir comprobante") }
    static var rejectionReasonHeader: String { FeatureL10n.text("payments.rejection_reason_header", "Motivo del rechazo") }
    static var actionClose: String { FeatureL10n.text("payments.action_close", "Cerrar") }

    // MARK: - Rejection Form Sheet
    static var rejectTitle: String { FeatureL10n.text("payments.reject_title", "Rechazar pago") }
    static var rejectReasonLabel: String { FeatureL10n.text("payments.reject_reason_label", "Motivo del rechazo") }
    static var actionCancel: String { FeatureL10n.text("payments.action_cancel", "Cancelar") }
    static var actionReject: String { FeatureL10n.text("payments.action_reject", "Rechazar") }

    // MARK: - Submission Card & Actions
    static var cardReceiptAttached: String { FeatureL10n.text("payments.card_receipt_attached", "Comprobante adjunto") }
    static var cardReviewPrompt: String { FeatureL10n.text("payments.card_review_prompt", "Toca para revisar") }
    
    static func cardRejectionReason(_ reason: String) -> String {
        FeatureL10n.format("payments.card_rejection_reason", "Motivo: %@", reason)
    }

    static var statusPending: String { FeatureL10n.text("payments.status.pending", "Pendiente") }
    static var statusApproved: String { FeatureL10n.text("payments.status.approved", "Aprobado") }
    static var statusRejected: String { FeatureL10n.text("payments.status.rejected", "Rechazado") }

    static var actionApprove: String { FeatureL10n.text("payments.action_approve", "Aprobar") }

    // MARK: - Network Error Fallbacks
    static var decodingError: String { FeatureL10n.text("payments.error.decoding", "Error procesando respuesta") }
    static var unauthorizedError: String { FeatureL10n.text("payments.error.unauthorized", "Sesión expirada") }
    static var unknownError: String { FeatureL10n.text("payments.error.unknown", "Error desconocido") }
}
