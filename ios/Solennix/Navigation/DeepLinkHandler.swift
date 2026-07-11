import Foundation
import CoreSpotlight
import SolennixCore

// MARK: - Deep Link Action

/// Actions that can be triggered by opening a deep link URL.
enum DeepLinkAction: Equatable {
    case resetPassword(token: String)
    case teamInvite(token: String)
    /// Navigate to an event's detail screen.
    case showEvent(id: String)
    /// Navigate to an event's detail screen and open the record-payment sheet.
    case showEventPayment(id: String)
}

// MARK: - Spotlight Action

/// Actions derived from tapping a Core Spotlight search result.
enum SpotlightAction: Equatable {
    case showClient(id: String)
    case showEvent(id: String)
    case showProduct(id: String)
}

// MARK: - Deep Link Handler

/// Parses `solennix://` scheme URLs into `DeepLinkAction` values.
///
/// Supported deep links:
/// - `solennix://reset-password?token=<TOKEN>` — Navigate to the password reset flow.
/// - `solennix://team-invite?token=<TOKEN>` — Navigate to team invite accept flow.
/// - `solennix://event/{id}` — Navigate to the event detail screen.
/// - `solennix://event/{id}/payment` — Navigate to the event detail and open the payment sheet.
enum DeepLinkHandler {

    /// Parse a URL into a deep link action.
    /// - Parameter url: The URL to parse (must use the `solennix` scheme).
    /// - Returns: A `DeepLinkAction` if the URL is recognized, or `nil`.
    static func handle(_ url: URL) -> DeepLinkAction? {
        guard url.scheme == "solennix" else { return nil }

        switch url.host {
        case "reset-password":
            guard let token = url.queryParameters["token"], !token.isEmpty else {
                return nil
            }
            return .resetPassword(token: token)

        case "team-invite":
            guard let token = url.queryParameters["token"], !token.isEmpty else {
                return nil
            }
            return .teamInvite(token: token)

        case "event":
            return parseEventRoute(url)

        default:
            return nil
        }
    }

    // MARK: - Event Route Parsing

    /// Parses `solennix://event/{id}` and `solennix://event/{id}/payment`.
    ///
    /// Unknown sub-paths and missing ids return `nil` so the app stays at root
    /// instead of navigating to a broken destination.
    /// - Parameter url: The URL with `host == "event"`.
    /// - Returns: A `DeepLinkAction`, or `nil` if the path is unrecognized.
    private static func parseEventRoute(_ url: URL) -> DeepLinkAction? {
        // `URLComponents` is required because `URL.path` is empty for custom
        // schemes; the path lives in the components' `path` property.
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return nil
        }
        let segments = components.path
            .split(separator: "/", omittingEmptySubsequences: true)
            .map(String.init)

        // Expected shapes: ["{id}"] or ["{id}", "payment"]
        guard let eventId = segments.first, !eventId.isEmpty else {
            return nil
        }

        // Reject anything longer than the two supported shapes so typos like
        // `event/{id}/payment/extra` don't silently match the payment route.
        guard segments.count <= 2 else { return nil }

        switch segments.dropFirst().first {
        case nil:
            return .showEvent(id: eventId)
        case "payment":
            return .showEventPayment(id: eventId)
        default:
            return nil
        }
    }

    // MARK: - Spotlight Handling

    /// Parsea una actividad de usuario de Core Spotlight y devuelve la acción correspondiente.
    ///
    /// El identificador único sigue el formato `solennix.{tipo}.{id}`,
    /// por ejemplo `solennix.client.abc123`.
    /// - Parameter userActivity: La actividad de usuario recibida del sistema.
    /// - Returns: Un `SpotlightAction` si el identificador es reconocido, o `nil`.
    static func handleSpotlight(_ userActivity: NSUserActivity) -> SpotlightAction? {
        guard userActivity.activityType == CSSearchableItemActionType,
              let identifier = userActivity.userInfo?[CSSearchableItemActivityIdentifier] as? String else {
            return nil
        }

        let components = identifier.split(separator: ".")
        // Esperamos el formato: solennix.{type}.{id}
        guard components.count >= 3, components[0] == "solennix" else {
            return nil
        }

        let type = String(components[1])
        let id = components.dropFirst(2).joined(separator: ".")

        switch type {
        case "client":
            return .showClient(id: id)
        case "event":
            return .showEvent(id: id)
        case "product":
            return .showProduct(id: id)
        default:
            return nil
        }
    }

    /// Convierte un `SpotlightAction` en su `Route` correspondiente para la navegación.
    /// - Parameter action: La acción de Spotlight.
    /// - Returns: La ruta de navegación correspondiente.
    static func route(for action: SpotlightAction) -> Route {
        switch action {
        case .showClient(let id):
            return .clientDetail(id: id)
        case .showEvent(let id):
            return .eventDetail(id: id)
        case .showProduct(let id):
            return .productDetail(id: id)
        }
    }
}

// MARK: - URL Query Parameters Extension

extension URL {

    /// Parses the query string into a dictionary of key-value pairs.
    ///
    /// Example:
    /// ```
    /// let url = URL(string: "solennix://reset-password?token=abc123")!
    /// url.queryParameters["token"] // "abc123"
    /// ```
    var queryParameters: [String: String] {
        guard let components = URLComponents(url: self, resolvingAgainstBaseURL: false),
              let queryItems = components.queryItems else {
            return [:]
        }
        var params: [String: String] = [:]
        for item in queryItems {
            if let value = item.value {
                params[item.name] = value
            }
        }
        return params
    }
}
