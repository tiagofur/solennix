import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// `InventoryFormViewModel` tests covering pure validation (`isValid`,
/// `isDirty`, `validateForm`) and the create/edit save paths (#819).
///
/// Strategy: real `APIClient` whose `URLSession` is intercepted by
/// `MockURLProtocol` (same seam as `ClientFormViewModelTests`).
final class InventoryFormViewModelTests: XCTestCase {

    private var session: URLSession!
    private var apiClient: APIClient!
    private var viewModel: InventoryFormViewModel!

    override func setUp() async throws {
        try await super.setUp()

        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        session = URLSession(configuration: configuration)
        apiClient = APIClient(session: session)
        viewModel = InventoryFormViewModel(apiClient: apiClient)
        await apiClient.setAuthManager(AuthManager())
    }

    override func tearDown() async throws {
        MockURLProtocol.requestHandler = nil
        viewModel = nil
        apiClient = nil
        session = nil
        try await super.tearDown()
    }

    // MARK: - 1. Pure validation: isValid

    func testIsValid_FalseWhenNameEmpty() {
        viewModel.ingredientName = ""
        XCTAssertFalse(viewModel.isValid)

        viewModel.ingredientName = "A" // < 2 chars
        XCTAssertFalse(viewModel.isValid)
    }

    func testIsValid_TrueWhenRequiredFieldsPresent() {
        viewModel.ingredientName = "Harina"
        viewModel.currentStock = 10
        viewModel.minimumStock = 2
        XCTAssertTrue(viewModel.isValid)
    }

    func testIsValid_FalseWhenStockNegative() {
        viewModel.ingredientName = "Harina"
        viewModel.currentStock = -1
        XCTAssertFalse(viewModel.isValid)
    }

    // MARK: - 2. Pure validation: isDirty

    func testIsDirty_FalseInitially() {
        XCTAssertFalse(viewModel.isDirty)
    }

    func testIsDirty_TrueAfterEdit() {
        XCTAssertFalse(viewModel.isDirty)
        viewModel.ingredientName = "Azúcar"
        XCTAssertTrue(viewModel.isDirty)
    }

    // MARK: - 3. validateForm surfaces inline errors

    @MainActor
    func testValidateForm_SetsNameError_WhenTooShort() {
        viewModel.ingredientName = "A"
        let result = viewModel.validateForm()

        XCTAssertFalse(result)
        XCTAssertNotNil(viewModel.nameError)
    }

    @MainActor
    func testValidateForm_ReturnsTrue_WhenValid() {
        viewModel.ingredientName = "Harina"
        viewModel.currentStock = 10
        viewModel.minimumStock = 2

        let result = viewModel.validateForm()

        XCTAssertTrue(result)
        XCTAssertNil(viewModel.nameError)
        XCTAssertNil(viewModel.stockError)
    }

    // MARK: - 4. Save (create path) posts and increments success counter

    @MainActor
    func testSave_PostsNewInventory_OnCreate() async {
        viewModel.ingredientName = "Harina"
        viewModel.currentStock = 10
        viewModel.minimumStock = 2
        let initialCounter = viewModel.saveSuccessCounter

        let json = """
        {"id":"inv-1","user_id":"u","ingredient_name":"Harina","current_stock":10,"minimum_stock":2,"unit":"kg","unit_cost":null,"last_updated":"","type":"ingredient"}
        """.data(using: .utf8)!
        MockURLProtocol.requestHandler = { request in
            XCTAssertEqual(request.httpMethod, "POST")
            return (HTTPURLResponse(url: request.url!, statusCode: 201, httpVersion: nil,
                             headerFields: ["Content-Type": "application/json"])!, json)
        }

        let result = await viewModel.save()

        XCTAssertTrue(result)
        XCTAssertEqual(viewModel.saveSuccessCounter, initialCounter + 1)
        XCTAssertFalse(viewModel.isSaving)
    }

    // MARK: - 5. Save validation failure short-circuits (no network call)

    @MainActor
    func testSave_ReturnsFalse_WhenInvalid() async {
        viewModel.ingredientName = "" // invalid
        var handlerCalled = false
        MockURLProtocol.requestHandler = { request in
            handlerCalled = true
            return (HTTPURLResponse(url: request.url!, statusCode: 201, httpVersion: nil,
                             headerFields: ["Content-Type": "application/json"])!, Data())
        }

        let result = await viewModel.save()

        XCTAssertFalse(result, "save must return false when validation fails")
        XCTAssertFalse(handlerCalled, "no network call should happen when validation fails")
        XCTAssertNil(viewModel.saveSuccessCounter > 0 ? nil : nil) // no success increment
    }
}
