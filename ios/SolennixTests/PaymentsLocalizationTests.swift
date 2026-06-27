import XCTest
import Foundation
@testable import SolennixFeatures

// MARK: - Payments Localization Tests

/// Resolution smoke tests (B-1, system-locale resolution). See the contract in
/// `AuthLocalizationTests`; these tests assert the EXPECTED value for the
/// simulator's current system locale (no runtime override — retired in B-1).
final class PaymentsLocalizationTests: XCTestCase {

    private func expected(spanish: String, english: String) -> String {
        FeatureL10n.languageCode == "en" ? english : spanish
    }

    func testPaymentsStringsResolve() {
        // Navigation & Alerts
        XCTAssertEqual(PaymentsStrings.title, expected(spanish: "Pagos recibidos", english: "Received Payments"))
        XCTAssertEqual(PaymentsStrings.errorTitle, expected(spanish: "Error", english: "Error"))
        XCTAssertEqual(PaymentsStrings.errorOk, expected(spanish: "OK", english: "OK"))

        // Empty State
        XCTAssertEqual(PaymentsStrings.emptyTitle, expected(spanish: "Sin pagos pendientes", english: "No Pending Payments"))
        XCTAssertEqual(
            PaymentsStrings.emptyMessage,
            expected(
                spanish: "Cuando tus clientes suban comprobantes de transferencia, los verás aquí para aprobar o rechazar.",
                english: "When your clients submit transfer receipts, you'll see them here to approve or reject."
            )
        )
        XCTAssertEqual(PaymentsStrings.actionRetry, expected(spanish: "Reintentar", english: "Retry"))

        // Plan Locked
        XCTAssertEqual(PaymentsStrings.proOnlyTitle, expected(spanish: "Función exclusiva para usuarios Pro.", english: "Pro Exclusive Feature"))
        XCTAssertEqual(
            PaymentsStrings.proOnlyMessage,
            expected(
                spanish: "Actualiza tu plan para revisar y aprobar pagos recibidos de clientes.",
                english: "Upgrade your plan to review and approve payment receipts submitted by clients."
            )
        )

        // Detail Sheet
        XCTAssertEqual(PaymentsStrings.detailTitle, expected(spanish: "Detalle de pago", english: "Payment Details"))
        XCTAssertEqual(PaymentsStrings.clientPlaceholder, expected(spanish: "Cliente", english: "Client"))
        XCTAssertEqual(PaymentsStrings.eventPlaceholder, expected(spanish: "Evento", english: "Event"))
        XCTAssertEqual(PaymentsStrings.receiptHeader, expected(spanish: "Comprobante", english: "Receipt"))
        XCTAssertEqual(PaymentsStrings.receiptFallback, expected(spanish: "No se pudo previsualizar el archivo", english: "Could not preview file"))
        XCTAssertEqual(PaymentsStrings.openReceipt, expected(spanish: "Abrir comprobante", english: "Open receipt"))
        XCTAssertEqual(PaymentsStrings.rejectionReasonHeader, expected(spanish: "Motivo del rechazo", english: "Rejection Reason"))
        XCTAssertEqual(PaymentsStrings.actionClose, expected(spanish: "Cerrar", english: "Close"))

        // Rejection Form
        XCTAssertEqual(PaymentsStrings.rejectTitle, expected(spanish: "Rechazar pago", english: "Reject Payment"))
        XCTAssertEqual(PaymentsStrings.rejectReasonLabel, expected(spanish: "Motivo del rechazo", english: "Rejection Reason"))
        XCTAssertEqual(PaymentsStrings.actionCancel, expected(spanish: "Cancelar", english: "Cancel"))
        XCTAssertEqual(PaymentsStrings.actionReject, expected(spanish: "Rechazar", english: "Reject"))

        // Card & Actions & Badge
        XCTAssertEqual(PaymentsStrings.cardReceiptAttached, expected(spanish: "Comprobante adjunto", english: "Receipt attached"))
        XCTAssertEqual(PaymentsStrings.cardReviewPrompt, expected(spanish: "Toca para revisar", english: "Tap to review"))
        XCTAssertEqual(
            PaymentsStrings.cardRejectionReason("fondos insuficientes"),
            expected(spanish: "Motivo: fondos insuficientes", english: "Reason: insufficient funds")
        )
        XCTAssertEqual(PaymentsStrings.statusPending, expected(spanish: "Pendiente", english: "Pending"))
        XCTAssertEqual(PaymentsStrings.statusApproved, expected(spanish: "Aprobado", english: "Approved"))
        XCTAssertEqual(PaymentsStrings.statusRejected, expected(spanish: "Rechazado", english: "Rejected"))
        XCTAssertEqual(PaymentsStrings.actionApprove, expected(spanish: "Aprobar", english: "Approve"))

        // Fallbacks
        XCTAssertEqual(PaymentsStrings.decodingError, expected(spanish: "Error procesando respuesta", english: "Error processing response"))
        XCTAssertEqual(PaymentsStrings.unauthorizedError, expected(spanish: "Sesión expirada", english: "Session expired"))
        XCTAssertEqual(PaymentsStrings.unknownError, expected(spanish: "Error desconocido", english: "Unknown error"))
    }
}
