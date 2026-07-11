import Foundation

// MARK: - Deep Link Pending Action

/// One-shot bridge for deep links that need to trigger an action on a view
/// inside `SolennixFeatures` after navigation completes.
///
/// The app target (`ContentView.handleDeepLink`) sets `openPaymentEventId`
/// before pushing the `eventDetail` route; `EventDetailView` consumes and
/// clears it in its `.task` after `loadData` finishes. This avoids timing
/// races between route push, view init, and data load, and keeps the payment
/// sheet trigger (a local `@State` on the ViewModel) decoupled from the
/// `Route` enum — which lives here in `SolennixCore` and cannot express
/// view-local sheet state.
public enum DeepLinkPendingAction {

    /// Event id whose detail screen should auto-open the record-payment sheet.
    /// Set by a `solennix://event/{id}/payment` deep link; cleared on consume.
    public static var openPaymentEventId: String?
}
