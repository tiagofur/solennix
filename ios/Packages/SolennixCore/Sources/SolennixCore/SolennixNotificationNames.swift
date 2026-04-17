import Foundation

// MARK: - Cross-layer Notification Names
//
// Estos nombres viajan entre packages (SolennixFeatures) y la app target (Solennix),
// que normalmente no se ven entre sí. Definirlos en SolennixCore les da un único
// punto de referencia.

public extension Notification.Name {

    /// Posted por los ViewModels cuando un pago se registra exitosamente.
    /// El observador (típicamente `NotificationManager` en la app target) puede
    /// programar un recibo en el Notification Center.
    ///
    /// `userInfo` esperado:
    /// - `payment_id: String`
    /// - `event_id: String`
    /// - `client_name: String`
    /// - `amount: Double`
    static let solennixPaymentRegistered = Notification.Name("solennix.payment.registered")
    
    /// Posted por los ViewModels cuando un pago se elimina.
    static let solennixPaymentDeleted = Notification.Name("solennix.payment.deleted")
    
    /// Posted por los ViewModels cuando un evento cambia de estado o se edita.
    static let solennixEventUpdated = Notification.Name("solennix.event.updated")
}
