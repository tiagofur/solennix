import XCTest
import Foundation
import SolennixCore

final class APIErrorTests: XCTestCase {

    func testErrorDescriptionForCoreCases() {
        XCTAssertEqual(APIError.unauthorized.errorDescription, "Tu sesion ha expirado. Por favor inicia sesion de nuevo.")
        XCTAssertEqual(APIError.networkError("timeout").errorDescription, "Error de red: timeout")
        XCTAssertEqual(APIError.serverError(statusCode: 500, message: "boom").errorDescription, "Error del servidor (500): boom")
        XCTAssertEqual(APIError.decodingError.errorDescription, "Error al procesar la respuesta del servidor.")
        XCTAssertEqual(APIError.unknown.errorDescription, "Ocurrio un error desconocido.")
    }

    func testPlanLimitExceededUsesBackendMessage() {
        let error = APIError.planLimitExceeded(
            message: "Límite alcanzado",
            limitType: "products",
            current: 10,
            max: 10
        )

        XCTAssertEqual(error.errorDescription, "Límite alcanzado")
        XCTAssertEqual(error.userFacingMessage, "Límite alcanzado")
    }

    func testUserFacingMessageForAPIErrorCases() {
        XCTAssertEqual(APIError.unauthorized.userFacingMessage, "Sesión expirada. Iniciá sesión de nuevo.")
        XCTAssertEqual(APIError.networkError("x").userFacingMessage, "Ocurrió un error de conexión. Intentá de nuevo.")
        XCTAssertEqual(APIError.decodingError.userFacingMessage, "Error al procesar la respuesta del servidor.")
        XCTAssertEqual(APIError.unknown.userFacingMessage, "Ocurrió un error inesperado. Intentá de nuevo.")
    }

    func testUserFacingMessageForStatusCodeUsesExpectedMappings() {
        XCTAssertEqual(APIError.userFacingMessage(forStatusCode: 401), "Sesión expirada. Iniciá sesión de nuevo.")
        XCTAssertEqual(APIError.userFacingMessage(forStatusCode: 403), "No tenés permisos para esta acción.")
        XCTAssertEqual(APIError.userFacingMessage(forStatusCode: 404), "No se encontró el recurso solicitado.")
        XCTAssertEqual(APIError.userFacingMessage(forStatusCode: 429), "Demasiadas solicitudes. Esperá un momento e intentá de nuevo.")
        XCTAssertEqual(APIError.userFacingMessage(forStatusCode: 503), "Error del servidor. Intentá más tarde.")
        XCTAssertEqual(APIError.userFacingMessage(forStatusCode: 499, serverMessage: "detalle"), "detalle")
    }

    func testUserFacingMessageForStatusCodeUsesFallbacksWhenNeeded() {
        XCTAssertEqual(APIError.userFacingMessage(forStatusCode: 409), "Conflicto con los datos actuales. Intentá de nuevo.")
        XCTAssertEqual(APIError.userFacingMessage(forStatusCode: 422), "Los datos enviados no son válidos.")
        XCTAssertEqual(APIError.userFacingMessage(forStatusCode: 418), "Error en la solicitud. Intentá de nuevo.")
        XCTAssertEqual(APIError.userFacingMessage(forStatusCode: 302), "Ocurrió un error inesperado. Intentá de nuevo.")
    }

    func testUserFacingMessageForURLErrorMappings() {
        XCTAssertEqual(APIError.userFacingMessage(for: URLError(.timedOut)), "La conexión tardó demasiado. Intentá de nuevo.")
        XCTAssertEqual(APIError.userFacingMessage(for: URLError(.notConnectedToInternet)), "Sin conexión a internet.")
        XCTAssertEqual(APIError.userFacingMessage(for: URLError(.networkConnectionLost)), "Se perdió la conexión. Intentá de nuevo.")
        XCTAssertEqual(APIError.userFacingMessage(for: URLError(.cannotConnectToHost)), "No se pudo conectar al servidor. Verificá tu conexión.")
        XCTAssertEqual(APIError.userFacingMessage(for: URLError(.secureConnectionFailed)), "Error de seguridad en la conexión. Intentá de nuevo.")
        XCTAssertEqual(APIError.userFacingMessage(for: URLError(.badURL)), "Error de conexión. Intentá de nuevo.")
    }

    func testServerErrorUserFacingUsesStatusMapping() {
        let error = APIError.serverError(statusCode: 422, message: "Campo inválido")
        XCTAssertEqual(error.userFacingMessage, "Campo inválido")
    }
}
