import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

final class EventListViewModelTests: XCTestCase {

    private var apiClient: APIClient!
    private var viewModel: EventListViewModel!

    override func setUp() async throws {
        try await super.setUp()
        apiClient = APIClient()
        viewModel = EventListViewModel(apiClient: apiClient, eventRepository: nil)
    }

    override func tearDown() async throws {
        viewModel = nil
        apiClient = nil
        try await super.tearDown()
    }

    // MARK: - 1. Sorting Directions
    func testSortingDirections() {
        let event1 = Event(
            id: "1",
            userId: "user-1",
            clientId: "c-1",
            eventDate: "2026-07-10",
            serviceType: "Catering",
            numPeople: 50,
            status: .confirmed,
            discount: 0.0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0.16,
            taxAmount: 0.0,
            totalAmount: 1000.0,
            createdAt: "2026-07-09T00:00:00Z",
            updatedAt: "2026-07-09T00:00:00Z"
        )
        let event2 = Event(
            id: "2",
            userId: "user-1",
            clientId: "c-2",
            eventDate: "2026-07-08",
            serviceType: "Decoration",
            numPeople: 50,
            status: .confirmed,
            discount: 0.0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0.16,
            taxAmount: 0.0,
            totalAmount: 500.0,
            createdAt: "2026-07-09T00:00:00Z",
            updatedAt: "2026-07-09T00:00:00Z"
        )
        let event3 = Event(
            id: "3",
            userId: "user-1",
            clientId: "c-1",
            eventDate: "2026-07-15",
            serviceType: "Audio",
            numPeople: 50,
            status: .confirmed,
            discount: 0.0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0.16,
            taxAmount: 0.0,
            totalAmount: 1500.0,
            createdAt: "2026-07-09T00:00:00Z",
            updatedAt: "2026-07-09T00:00:00Z"
        )

        viewModel.events = [event1, event2, event3]
        viewModel.clients = [
            Client(
                id: "c-1",
                userId: "user-1",
                name: "Alpha Client",
                phone: "1234567890",
                createdAt: "2026-07-09T00:00:00Z",
                updatedAt: "2026-07-09T00:00:00Z"
            ),
            Client(
                id: "c-2",
                userId: "user-1",
                name: "Beta Client",
                phone: "1234567890",
                createdAt: "2026-07-09T00:00:00Z",
                updatedAt: "2026-07-09T00:00:00Z"
            )
        ]

        // Default sort: eventDate descending
        viewModel.sortField = .eventDate
        viewModel.sortAscending = false
        var filtered = viewModel.filteredEvents
        XCTAssertEqual(filtered[0].id, "3") // July 15
        XCTAssertEqual(filtered[1].id, "1") // July 10
        XCTAssertEqual(filtered[2].id, "2") // July 8

        // Sort: eventDate ascending
        viewModel.applySort(.eventDate) // should toggle direction
        filtered = viewModel.filteredEvents
        XCTAssertEqual(filtered[0].id, "2")
        XCTAssertEqual(filtered[1].id, "1")
        XCTAssertEqual(filtered[2].id, "3")

        // Sort: totalAmount descending
        viewModel.sortField = .totalAmount
        viewModel.sortAscending = false
        filtered = viewModel.filteredEvents
        XCTAssertEqual(filtered[0].id, "3") // 1500
        XCTAssertEqual(filtered[1].id, "1") // 1000
        XCTAssertEqual(filtered[2].id, "2") // 500

        // Sort: totalAmount ascending
        viewModel.applySort(.totalAmount) // should toggle direction
        filtered = viewModel.filteredEvents
        XCTAssertEqual(filtered[0].id, "2")
        XCTAssertEqual(filtered[1].id, "1")
        XCTAssertEqual(filtered[2].id, "3")

        // Sort: serviceType (natural default for string fields is ASC)
        viewModel.applySort(.serviceType)
        filtered = viewModel.filteredEvents
        XCTAssertEqual(filtered[0].serviceType, "Audio")
        XCTAssertEqual(filtered[1].serviceType, "Catering")
        XCTAssertEqual(filtered[2].serviceType, "Decoration")

        // Sort: clientName (natural default is ASC)
        viewModel.applySort(.clientName)
        filtered = viewModel.filteredEvents
        XCTAssertEqual(viewModel.clientName(for: filtered[0].clientId), "Alpha Client")
        XCTAssertEqual(viewModel.clientName(for: filtered[1].clientId), "Alpha Client")
        XCTAssertEqual(viewModel.clientName(for: filtered[2].clientId), "Beta Client")
    }

    // MARK: - 2. Complex Filter Combinations
    func testComplexFilterAndDateCombinations() {
        let event1 = Event(
            id: "1",
            userId: "user-1",
            clientId: "c-1",
            eventDate: "2026-07-10",
            serviceType: "Catering",
            numPeople: 50,
            status: .confirmed,
            discount: 0.0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0.16,
            taxAmount: 0.0,
            totalAmount: 1000.0,
            createdAt: "2026-07-09T00:00:00Z",
            updatedAt: "2026-07-09T00:00:00Z"
        )
        let event2 = Event(
            id: "2",
            userId: "user-1",
            clientId: "c-2",
            eventDate: "2026-07-08",
            serviceType: "Decoration",
            numPeople: 50,
            status: .quoted,
            discount: 0.0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0.16,
            taxAmount: 0.0,
            totalAmount: 500.0,
            createdAt: "2026-07-09T00:00:00Z",
            updatedAt: "2026-07-09T00:00:00Z"
        )
        let event3 = Event(
            id: "3",
            userId: "user-1",
            clientId: "c-1",
            eventDate: "2026-07-15",
            serviceType: "Audio",
            numPeople: 50,
            status: .completed,
            discount: 0.0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0.16,
            taxAmount: 0.0,
            totalAmount: 1500.0,
            createdAt: "2026-07-09T00:00:00Z",
            updatedAt: "2026-07-09T00:00:00Z"
        )

        viewModel.events = [event1, event2, event3]
        viewModel.clients = [
            Client(
                id: "c-1",
                userId: "user-1",
                name: "Alpha",
                phone: "1234567890",
                createdAt: "2026-07-09T00:00:00Z",
                updatedAt: "2026-07-09T00:00:00Z"
            ),
            Client(
                id: "c-2",
                userId: "user-1",
                name: "Beta",
                phone: "1234567890",
                createdAt: "2026-07-09T00:00:00Z",
                updatedAt: "2026-07-09T00:00:00Z"
            )
        ]

        // Filter by status confirmed
        viewModel.selectedStatus = .confirmed
        XCTAssertEqual(viewModel.filteredEvents.count, 1)
        XCTAssertEqual(viewModel.filteredEvents.first?.id, "1")

        // Reset status, filter by search query
        viewModel.selectedStatus = nil
        viewModel.searchQuery = "deco"
        XCTAssertEqual(viewModel.filteredEvents.count, 1)
        XCTAssertEqual(viewModel.filteredEvents.first?.id, "2")

        // Search query by client name
        viewModel.searchQuery = "alpha"
        XCTAssertEqual(viewModel.filteredEvents.count, 2) // event1 & event3 belong to "Alpha"

        // Filter by date range (inclusive)
        viewModel.searchQuery = ""
        
        let cal = Calendar.current
        var comps = DateComponents()
        comps.year = 2026
        comps.month = 7
        comps.day = 9
        let start = cal.date(from: comps)!
        
        comps.day = 12
        let end = cal.date(from: comps)!

        viewModel.dateRangeStart = start
        viewModel.dateRangeEnd = end

        // Should only return event1 (July 10)
        XCTAssertEqual(viewModel.filteredEvents.count, 1)
        XCTAssertEqual(viewModel.filteredEvents.first?.id, "1")
    }

    // MARK: - 3. CSV Content Escaping
    func testCSVContentEscaping() {
        let event1 = Event(
            id: "1",
            userId: "user-1",
            clientId: "c-1",
            eventDate: "2026-07-10T00:00:00Z",
            serviceType: "Catering, Premium & \"VIP\"",
            numPeople: 50,
            status: .confirmed,
            discount: 0.0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0.16,
            taxAmount: 0.0,
            totalAmount: 1000.0,
            location: "Main Hall\nSecond Floor",
            createdAt: "2026-07-09T00:00:00Z",
            updatedAt: "2026-07-09T00:00:00Z"
        )

        viewModel.events = [event1]
        viewModel.clients = [
            Client(
                id: "c-1",
                userId: "user-1",
                name: "Alpha, Client",
                phone: "1234567890",
                createdAt: "2026-07-09T00:00:00Z",
                updatedAt: "2026-07-09T00:00:00Z"
            )
        ]

        let csv = viewModel.generateCsvContent()

        // Verify CSV header contains expected columns
        XCTAssertTrue(csv.contains("Nombre,Fecha,Cliente,Estado,Total,Personas,Lugar"))

        // Verify escaping:
        // 1. serviceType "Catering, Premium & \"VIP\"" has comma and double quotes. It must be wrapped in quotes and internal quotes doubled:
        //    "Catering, Premium & ""VIP"""
        XCTAssertTrue(csv.contains("\"Catering, Premium & \"\"VIP\"\"\""))

        // 2. Client name "Alpha, Client" has comma. Must be wrapped in quotes:
        //    "Alpha, Client"
        XCTAssertTrue(csv.contains("\"Alpha, Client\""))

        // 3. Location "Main Hall\nSecond Floor" has newline. Must be wrapped in quotes:
        //    "Main Hall\nSecond Floor"
        XCTAssertTrue(csv.contains("\"Main Hall\nSecond Floor\""))
    }
}
