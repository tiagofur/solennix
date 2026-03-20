import Foundation
import CoreSpotlight
import SolennixCore

// MARK: - Deep Link Action

/// Actions that can be triggered by opening a deep link URL.
enum DeepLinkAction: Equatable {
    case resetPassword(token: String)
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
