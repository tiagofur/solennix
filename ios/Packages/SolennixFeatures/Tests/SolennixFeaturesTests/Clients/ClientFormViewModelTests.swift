import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

final class ClientFormViewModelTests: XCTestCase {

    private var session: URLSession!
    private var apiClient: APIClient!
    private var viewModel: ClientFormViewModel!

    override func setUp() async throws {
        try await super.setUp()
        
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [ClientFormMockURLProtocol.self]
        session = URLSession(configuration: configuration)
        apiClient = APIClient(session: session)
        viewModel = await ClientFormViewModel(apiClient: apiClient)
        await apiClient.setAuthManager(AuthManager())
    }

    override func tearDown() async throws {
        ClientFormMockURLProtocol.requestHandler = nil
        viewModel = nil
        apiClient = nil
        session = nil
        try await super.tearDown()
    }

    // MARK: - 1. Validation Rules
    @MainActor
    func testNameValidation() {
        viewModel.name = ""
        XCTAssertFalse(viewModel.isNameValid)

        viewModel.name = "A"
        XCTAssertFalse(viewModel.isNameValid)

        viewModel.name = "Ab"
        XCTAssertTrue(viewModel.isNameValid)

        viewModel.name = "  Ab  "
        XCTAssertTrue(viewModel.isNameValid)
    }

    @MainActor
    func testPhoneValidation() {
        viewModel.phone = ""
        XCTAssertFalse(viewModel.isPhoneValid)

        viewModel.phone = "12345"
        XCTAssertFalse(viewModel.isPhoneValid)

        viewModel.phone = "123-456-7890"
        XCTAssertTrue(viewModel.isPhoneValid) // digits count = 10
    }

    @MainActor
    func testEmailValidation() {
        viewModel.email = ""
        XCTAssertFalse(viewModel.isEmailValid)

        viewModel.email = "invalid-email"
        XCTAssertFalse(viewModel.isEmailValid)

        viewModel.email = "invalid@domain"
        XCTAssertFalse(viewModel.isEmailValid)

        viewModel.email = "valid@domain.com"
        XCTAssertTrue(viewModel.isEmailValid)
    }

    @MainActor
    func testFormValidation() {
        viewModel.name = "John Doe"
        viewModel.phone = "1234567890"
        viewModel.email = "john@example.com"
        XCTAssertTrue(viewModel.isFormValid)

        viewModel.email = "invalid-email"
        XCTAssertFalse(viewModel.isFormValid)
    }

    // MARK: - 2. Dirty State Toggling
    @MainActor
    func testDirtyStateToggling() {
        XCTAssertFalse(viewModel.isDirty)

        viewModel.name = "John"
        XCTAssertTrue(viewModel.isDirty)

        viewModel.name = ""
        XCTAssertFalse(viewModel.isDirty)
    }

    // MARK: - 3. Save Success and Failure Behaviors
    @MainActor
    func testSaveSuccess() async {
        viewModel.name = "Jane Doe"
        viewModel.phone = "9876543210"
        viewModel.email = "jane@example.com"

        let mockResponseClient = Client(
            id: "client-123",
            userId: "user-1",
            name: "Jane Doe",
            phone: "9876543210",
            email: "jane@example.com",
            createdAt: "2026-07-09T00:00:00Z",
            updatedAt: "2026-07-09T00:00:00Z"
        )

        ClientFormMockURLProtocol.requestHandler = { request in
            XCTAssertEqual(request.httpMethod, "POST")
            XCTAssertTrue(request.url?.absoluteString.contains("/clients") == true)
            
            let data = try! JSONEncoder().encode(mockResponseClient)
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (response, data)
        }

        let savedClient = await viewModel.validateAndSave()

        XCTAssertNotNil(savedClient)
        XCTAssertEqual(savedClient?.id, "client-123")
        XCTAssertEqual(viewModel.saveSuccessCounter, 1)
        XCTAssertNil(viewModel.errorMessage)
    }

    @MainActor
    func testSaveFailure() async {
        viewModel.name = "Jane Doe"
        viewModel.phone = "9876543210"
        viewModel.email = "jane@example.com"

        ClientFormMockURLProtocol.requestHandler = { request in
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 400,
                httpVersion: nil,
                headerFields: nil
            )!
            return (response, Data())
        }

        let savedClient = await viewModel.validateAndSave()

        XCTAssertNil(savedClient)
        XCTAssertEqual(viewModel.saveErrorCounter, 1)
        XCTAssertNotNil(viewModel.errorMessage)
    }
}

// MARK: - Mock URL Protocol for ClientFormViewModelTests

class ClientFormMockURLProtocol: URLProtocol {
    static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool {
        return true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }

    override func startLoading() {
        guard let handler = ClientFormMockURLProtocol.requestHandler else {
            return
        }

        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}
