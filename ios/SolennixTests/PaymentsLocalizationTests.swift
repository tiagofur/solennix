import XCTest
import Foundation
@testable import SolennixFeatures

final class PaymentsLocalizationTests: XCTestCase {

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

    func testPaymentsStringsResolveForSpanish() {
        UserDefaults.standard.set("es-MX", forKey: "preferredLocale")

        // Navigation & Alerts
        XCTAssertEqual(PaymentsStrings.title, "Pagos recibidos")
        XCTAssertEqual(PaymentsStrings.errorTitle, "Error")
        XCTAssertEqual(PaymentsStrings.errorOk, "OK")

        // Empty State
        XCTAssertEqual(PaymentsStrings.emptyTitle, "Sin pagos pendientes")
        XCTAssertEqual(PaymentsStrings.emptyMessage, "Cuando tus clientes suban comprobantes de transferencia, los verás aquí para aprobar o rechazar.")
        XCTAssertEqual(PaymentsStrings.actionRefresh, "Actualizar")

        // Plan Locked
        XCTAssertEqual(PaymentsStrings.proOnlyTitle, "Función exclusiva para usuarios Pro.")
        XCTAssertEqual(PaymentsStrings.proOnlyMessage, "Actualiza tu plan para revisar y aprobar pagos recibidos de clientes.")

        // Detail Sheet
        XCTAssertEqual(PaymentsStrings.detailTitle, "Detalle de pago")
        XCTAssertEqual(PaymentsStrings.clientPlaceholder, "Cliente")
        XCTAssertEqual(PaymentsStrings.eventPlaceholder, "Evento")
        XCTAssertEqual(PaymentsStrings.receiptHeader, "Comprobante")
        XCTAssertEqual(PaymentsStrings.receiptFallback, "No se pudo previsualizar el archivo")
        XCTAssertEqual(PaymentsStrings.openReceipt, "Abrir comprobante")
        XCTAssertEqual(PaymentsStrings.rejectionReasonHeader, "Motivo del rechazo")
        XCTAssertEqual(PaymentsStrings.actionClose, "Cerrar")

        // Rejection Form
        XCTAssertEqual(PaymentsStrings.rejectTitle, "Rechazar pago")
        XCTAssertEqual(PaymentsStrings.rejectReasonLabel, "Motivo del rechazo")
        XCTAssertEqual(PaymentsStrings.actionCancel, "Cancelar")
        XCTAssertEqual(PaymentsStrings.actionReject, "Rechazar")

        // Card & Actions & Badge
        XCTAssertEqual(PaymentsStrings.cardReceiptAttached, "Comprobante adjunto")
        XCTAssertEqual(PaymentsStrings.cardReviewPrompt, "Toca para revisar")
        XCTAssertEqual(PaymentsStrings.cardRejectionReason("fondos insuficientes"), "Motivo: fondos insuficientes")
        XCTAssertEqual(PaymentsStrings.statusPending, "Pendiente")
        XCTAssertEqual(PaymentsStrings.statusApproved, "Aprobado")
        XCTAssertEqual(PaymentsStrings.statusRejected, "Rechazado")
        XCTAssertEqual(PaymentsStrings.actionApprove, "Aprobar")

        // Fallbacks
        XCTAssertEqual(PaymentsStrings.decodingError, "Error procesando respuesta")
        XCTAssertEqual(PaymentsStrings.unauthorizedError, "Sesión expirada")
        XCTAssertEqual(PaymentsStrings.unknownError, "Error desconocido")
    }

    func testPaymentsStringsResolveForEnglish() {
        UserDefaults.standard.set("en-US", forKey: "preferredLocale")

        // Navigation & Alerts
        XCTAssertEqual(PaymentsStrings.title, "Received Payments")
        XCTAssertEqual(PaymentsStrings.errorTitle, "Error")
        XCTAssertEqual(PaymentsStrings.errorOk, "OK")

        // Empty State
        XCTAssertEqual(PaymentsStrings.emptyTitle, "No Pending Payments")
        XCTAssertEqual(PaymentsStrings.emptyMessage, "When your clients submit transfer receipts, you'll see them here to approve or reject.")
        XCTAssertEqual(PaymentsStrings.actionRefresh, "Refresh")

        // Plan Locked
        XCTAssertEqual(PaymentsStrings.proOnlyTitle, "Pro Exclusive Feature")
        XCTAssertEqual(PaymentsStrings.proOnlyMessage, "Upgrade your plan to review and approve payment receipts submitted by clients.")

        // Detail Sheet
        XCTAssertEqual(PaymentsStrings.detailTitle, "Payment Details")
        XCTAssertEqual(PaymentsStrings.clientPlaceholder, "Client")
        XCTAssertEqual(PaymentsStrings.eventPlaceholder, "Event")
        XCTAssertEqual(PaymentsStrings.receiptHeader, "Receipt")
        XCTAssertEqual(PaymentsStrings.receiptFallback, "Could not preview file")
        XCTAssertEqual(PaymentsStrings.openReceipt, "Open receipt")
        XCTAssertEqual(PaymentsStrings.rejectionReasonHeader, "Rejection Reason")
        XCTAssertEqual(PaymentsStrings.actionClose, "Close")

        // Rejection Form
        XCTAssertEqual(PaymentsStrings.rejectTitle, "Reject Payment")
        XCTAssertEqual(PaymentsStrings.rejectReasonLabel, "Rejection Reason")
        XCTAssertEqual(PaymentsStrings.actionCancel, "Cancel")
        XCTAssertEqual(PaymentsStrings.actionReject, "Reject")

        // Card & Actions & Badge
        XCTAssertEqual(PaymentsStrings.cardReceiptAttached, "Receipt attached")
        XCTAssertEqual(PaymentsStrings.cardReviewPrompt, "Tap to review")
        XCTAssertEqual(PaymentsStrings.cardRejectionReason("insufficient funds"), "Reason: insufficient funds")
        XCTAssertEqual(PaymentsStrings.statusPending, "Pending")
        XCTAssertEqual(PaymentsStrings.statusApproved, "Approved")
        XCTAssertEqual(PaymentsStrings.statusRejected, "Rejected")
        XCTAssertEqual(PaymentsStrings.actionApprove, "Approve")

        // Fallbacks
        XCTAssertEqual(PaymentsStrings.decodingError, "Error processing response")
        XCTAssertEqual(PaymentsStrings.unauthorizedError, "Session expired")
        XCTAssertEqual(PaymentsStrings.unknownError, "Unknown error")
    }
}
