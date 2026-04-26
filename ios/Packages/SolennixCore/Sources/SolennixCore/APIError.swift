import Foundation

/// Represents errors that can occur during API communication.
public enum APIError: LocalizedError, Sendable {
    case unauthorized
    case networkError(String)
    case serverError(statusCode: Int, message: String)
    case decodingError
    case unknown
    /// Thrown when the backend returns 403 `{ error: "plan_limit_exceeded" }`.
    /// Carries the structured limit info so the UI can show a paywall.
    case planLimitExceeded(message: String, limitType: String, current: Int, max: Int)

    public var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "Tu sesion ha expirado. Por favor inicia sesion de nuevo."
        case .networkError(let message):
            return "Error de red: \(message)"
        case .serverError(let statusCode, let message):
            return "Error del servidor (\(statusCode)): \(message)"
        case .decodingError:
            return "Error al procesar la respuesta del servidor."
        case .unknown:
            return "Ocurrio un error desconocido."
        case .planLimitExceeded(let message, _, _, _):
            return message
        }
    }

    /// User-friendly message suitable for display in toasts/alerts.
    /// Maps technical error details to actionable Spanish messages.
    public var userFacingMessage: String {
        switch self {
        case .unauthorized:
            return "Sesión expirada. Iniciá sesión de nuevo."
        case .networkError:
            return "Ocurrió un error de conexión. Intentá de nuevo."
        case .serverError(let statusCode, let message):
            return Self.userFacingMessage(forStatusCode: statusCode, serverMessage: message)
        case .decodingError:
            return "Error al procesar la respuesta del servidor."
        case .unknown:
            return "Ocurrió un error inesperado. Intentá de nuevo."
        case .planLimitExceeded(let message, _, _, _):
            return message
        }
    }

    // MARK: - User-Facing Message Helpers

    /// Maps a URLError to a user-friendly Spanish message.
    public static func userFacingMessage(for urlError: URLError) -> String {
        switch urlError.code {
        case .timedOut:
            return "La conexión tardó demasiado. Intentá de nuevo."
        case .notConnectedToInternet:
            return "Sin conexión a internet."
        case .networkConnectionLost:
            return "Se perdió la conexión. Intentá de nuevo."
        case .cannotFindHost, .cannotConnectToHost, .dnsLookupFailed:
            return "No se pudo conectar al servidor. Verificá tu conexión."
        case .secureConnectionFailed, .serverCertificateUntrusted:
            return "Error de seguridad en la conexión. Intentá de nuevo."
        default:
            return "Error de conexión. Intentá de nuevo."
        }
    }

    /// Maps an HTTP status code to a user-friendly Spanish message.
    /// If the server provided a specific message, it is used for 4xx client errors.
    public static func userFacingMessage(forStatusCode statusCode: Int, serverMessage: String? = nil) -> String {
        switch statusCode {
        case 401:
            return "Sesión expirada. Iniciá sesión de nuevo."
        case 403:
            return "No tenés permisos para esta acción."
        case 404:
            return "No se encontró el recurso solicitado."
        case 409:
            return serverMessage ?? "Conflicto con los datos actuales. Intentá de nuevo."
        case 422:
            return serverMessage ?? "Los datos enviados no son válidos."
        case 429:
            return "Demasiadas solicitudes. Esperá un momento e intentá de nuevo."
        case 400...499:
            return serverMessage ?? "Error en la solicitud. Intentá de nuevo."
        case 500...599:
            return "Error del servidor. Intentá más tarde."
        default:
            return "Ocurrió un error inesperado. Intentá de nuevo."
        }
    }
}
