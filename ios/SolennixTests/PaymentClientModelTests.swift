import XCTest
import SolennixCore

final class PaymentModelTests: XCTestCase {
    
    // MARK: - Init Tests
    
    func testPaymentInitWithAllFields() {
        let payment = Payment(
            id: "pay_123",
            eventId: "evt_456",
            userId: "user_789",
            amount: 1500.50,
            paymentDate: "2025-05-10T10:30:00Z",
            paymentMethod: "credit_card",
            notes: "Deposit paid",
            createdAt: "2025-05-10T10:30:00Z"
        )
        
        XCTAssertEqual(payment.id, "pay_123")
        XCTAssertEqual(payment.eventId, "evt_456")
        XCTAssertEqual(payment.userId, "user_789")
        XCTAssertEqual(payment.amount, 1500.50)
        XCTAssertEqual(payment.paymentDate, "2025-05-10T10:30:00Z")
        XCTAssertEqual(payment.paymentMethod, "credit_card")
        XCTAssertEqual(payment.notes, "Deposit paid")
        XCTAssertEqual(payment.createdAt, "2025-05-10T10:30:00Z")
    }
    
    func testPaymentInitWithoutNotes() {
        let payment = Payment(
            id: "pay_123",
            eventId: "evt_456",
            userId: "user_789",
            amount: 1500.50,
            paymentDate: "2025-05-10T10:30:00Z",
            paymentMethod: "credit_card",
            notes: nil,
            createdAt: "2025-05-10T10:30:00Z"
        )
        
        XCTAssertNil(payment.notes)
    }
    
    // MARK: - Codable Tests
    
    func testPaymentDecodeFromSnakeCaseJSON() {
        let json = """
        {
            "id": "pay_123",
            "event_id": "evt_456",
            "user_id": "user_789",
            "amount": 1500.50,
            "payment_date": "2025-05-10T10:30:00Z",
            "payment_method": "credit_card",
            "notes": "Deposit paid",
            "created_at": "2025-05-10T10:30:00Z"
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let payment = try! decoder.decode(Payment.self, from: json)
        
        XCTAssertEqual(payment.id, "pay_123")
        XCTAssertEqual(payment.eventId, "evt_456")
        XCTAssertEqual(payment.userId, "user_789")
        XCTAssertEqual(payment.amount, 1500.50)
        XCTAssertEqual(payment.paymentDate, "2025-05-10T10:30:00Z")
        XCTAssertEqual(payment.paymentMethod, "credit_card")
        XCTAssertEqual(payment.notes, "Deposit paid")
        XCTAssertEqual(payment.createdAt, "2025-05-10T10:30:00Z")
    }
    
    func testPaymentDecodeWithoutNotes() {
        let json = """
        {
            "id": "pay_123",
            "event_id": "evt_456",
            "user_id": "user_789",
            "amount": 2000.00,
            "payment_date": "2025-05-10T10:30:00Z",
            "payment_method": "bank_transfer",
            "created_at": "2025-05-10T10:30:00Z"
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let payment = try! decoder.decode(Payment.self, from: json)
        
        XCTAssertNil(payment.notes)
        XCTAssertEqual(payment.paymentMethod, "bank_transfer")
    }
    
    // MARK: - Identifiable & Hashable Tests
    
    func testPaymentIdentifiable() {
        let payment1 = Payment(
            id: "pay_123",
            eventId: "evt_456",
            userId: "user_789",
            amount: 1500.50,
            paymentDate: "2025-05-10T10:30:00Z",
            paymentMethod: "credit_card",
            notes: nil,
            createdAt: "2025-05-10T10:30:00Z"
        )
        let payment2 = Payment(
            id: "pay_123",
            eventId: "evt_456",
            userId: "user_789",
            amount: 1500.50,
            paymentDate: "2025-05-10T10:30:00Z",
            paymentMethod: "credit_card",
            notes: "Different note",
            createdAt: "2025-05-10T10:30:00Z"
        )
        
        // Both have same id, should be equal
        XCTAssertEqual(payment1.id, payment2.id)
    }
    
    func testPaymentHashable() {
        let payment1 = Payment(
            id: "pay_123",
            eventId: "evt_456",
            userId: "user_789",
            amount: 1500.50,
            paymentDate: "2025-05-10T10:30:00Z",
            paymentMethod: "credit_card",
            notes: "Note 1",
            createdAt: "2025-05-10T10:30:00Z"
        )
        let payment2 = Payment(
            id: "pay_456",
            eventId: "evt_456",
            userId: "user_789",
            amount: 1500.50,
            paymentDate: "2025-05-10T10:30:00Z",
            paymentMethod: "credit_card",
            notes: "Note 1",
            createdAt: "2025-05-10T10:30:00Z"
        )
        
        var set: Set<Payment> = []
        set.insert(payment1)
        set.insert(payment2)
        
        XCTAssertEqual(set.count, 2)
    }
    
    // MARK: - Round-trip Tests
    
    func testPaymentEncodeDecode() {
        let original = Payment(
            id: "pay_123",
            eventId: "evt_456",
            userId: "user_789",
            amount: 3500.75,
            paymentDate: "2025-05-10T10:30:00Z",
            paymentMethod: "paypal",
            notes: "Final payment",
            createdAt: "2025-05-10T10:30:00Z"
        )
        
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let encoded = try! encoder.encode(original)
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let decoded = try! decoder.decode(Payment.self, from: encoded)
        
        XCTAssertEqual(decoded.id, original.id)
        XCTAssertEqual(decoded.eventId, original.eventId)
        XCTAssertEqual(decoded.amount, original.amount)
        XCTAssertEqual(decoded.notes, original.notes)
    }
}

// MARK: - Client Model Tests

final class ClientModelTests: XCTestCase {
    
    // MARK: - Init Tests
    
    func testClientInitWithRequiredFieldsOnly() {
        let client = Client(
            id: "cli_123",
            userId: "user_789",
            name: "John Doe",
            phone: "5551234567",
            createdAt: "2025-01-15T09:00:00Z",
            updatedAt: "2025-05-10T14:30:00Z"
        )
        
        XCTAssertEqual(client.id, "cli_123")
        XCTAssertEqual(client.userId, "user_789")
        XCTAssertEqual(client.name, "John Doe")
        XCTAssertEqual(client.phone, "5551234567")
        XCTAssertNil(client.email)
        XCTAssertNil(client.address)
        XCTAssertNil(client.city)
        XCTAssertNil(client.notes)
        XCTAssertNil(client.photoUrl)
        XCTAssertNil(client.totalEvents)
        XCTAssertNil(client.totalSpent)
        XCTAssertEqual(client.createdAt, "2025-01-15T09:00:00Z")
        XCTAssertEqual(client.updatedAt, "2025-05-10T14:30:00Z")
    }
    
    func testClientInitWithAllOptionalFields() {
        let client = Client(
            id: "cli_123",
            userId: "user_789",
            name: "Jane Smith",
            phone: "5559876543",
            email: "jane@example.com",
            address: "123 Main St",
            city: "New York",
            notes: "VIP client",
            photoUrl: "https://example.com/photo.jpg",
            totalEvents: 5,
            totalSpent: 15000.00,
            createdAt: "2025-01-15T09:00:00Z",
            updatedAt: "2025-05-10T14:30:00Z"
        )
        
        XCTAssertEqual(client.email, "jane@example.com")
        XCTAssertEqual(client.address, "123 Main St")
        XCTAssertEqual(client.city, "New York")
        XCTAssertEqual(client.notes, "VIP client")
        XCTAssertEqual(client.photoUrl, "https://example.com/photo.jpg")
        XCTAssertEqual(client.totalEvents, 5)
        XCTAssertEqual(client.totalSpent, 15000.00)
    }
    
    // MARK: - Codable Tests
    
    func testClientDecodeFromSnakeCaseJSON() {
        let json = """
        {
            "id": "cli_123",
            "user_id": "user_789",
            "name": "Maria Garcia",
            "phone": "5551234567",
            "email": "maria@example.com",
            "address": "456 Oak Ave",
            "city": "Mexico City",
            "notes": "Corporate client",
            "photo_url": "https://example.com/maria.jpg",
            "total_events": 3,
            "total_spent": 8500.00,
            "created_at": "2025-02-01T10:00:00Z",
            "updated_at": "2025-05-10T11:00:00Z"
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let client = try! decoder.decode(Client.self, from: json)
        
        XCTAssertEqual(client.id, "cli_123")
        XCTAssertEqual(client.userId, "user_789")
        XCTAssertEqual(client.name, "Maria Garcia")
        XCTAssertEqual(client.phone, "5551234567")
        XCTAssertEqual(client.email, "maria@example.com")
        XCTAssertEqual(client.address, "456 Oak Ave")
        XCTAssertEqual(client.city, "Mexico City")
        XCTAssertEqual(client.notes, "Corporate client")
        XCTAssertEqual(client.photoUrl, "https://example.com/maria.jpg")
        XCTAssertEqual(client.totalEvents, 3)
        XCTAssertEqual(client.totalSpent, 8500.00)
    }
    
    func testClientDecodeWithMissingOptionalFields() {
        let json = """
        {
            "id": "cli_456",
            "user_id": "user_999",
            "name": "Carlos Lopez",
            "phone": "5559876543",
            "created_at": "2025-03-10T09:00:00Z",
            "updated_at": "2025-05-10T14:00:00Z"
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let client = try! decoder.decode(Client.self, from: json)
        
        XCTAssertEqual(client.name, "Carlos Lopez")
        XCTAssertNil(client.email)
        XCTAssertNil(client.address)
        XCTAssertNil(client.city)
        XCTAssertNil(client.notes)
        XCTAssertNil(client.photoUrl)
        XCTAssertNil(client.totalEvents)
        XCTAssertNil(client.totalSpent)
    }
    
    func testClientDecodeWithPartialOptionalFields() {
        let json = """
        {
            "id": "cli_789",
            "user_id": "user_111",
            "name": "Sofia Moreno",
            "phone": "5558888888",
            "email": "sofia@example.com",
            "total_events": 2,
            "created_at": "2025-04-01T08:00:00Z",
            "updated_at": "2025-05-10T13:00:00Z"
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let client = try! decoder.decode(Client.self, from: json)
        
        XCTAssertEqual(client.email, "sofia@example.com")
        XCTAssertEqual(client.totalEvents, 2)
        XCTAssertNil(client.address)
        XCTAssertNil(client.totalSpent)
    }
    
    // MARK: - Identifiable & Hashable Tests
    
    func testClientIdentifiable() {
        let client1 = Client(
            id: "cli_123",
            userId: "user_789",
            name: "Test Client",
            phone: "5551234567",
            email: "test@example.com",
            createdAt: "2025-01-15T09:00:00Z",
            updatedAt: "2025-05-10T14:30:00Z"
        )
        let client2 = Client(
            id: "cli_123",
            userId: "user_999",
            name: "Different Name",
            phone: "5559876543",
            createdAt: "2025-01-15T09:00:00Z",
            updatedAt: "2025-05-10T14:30:00Z"
        )
        
        // Both have same id
        XCTAssertEqual(client1.id, client2.id)
    }
    
    func testClientHashable() {
        let client1 = Client(
            id: "cli_123",
            userId: "user_789",
            name: "Client A",
            phone: "5551234567",
            totalEvents: 1,
            createdAt: "2025-01-15T09:00:00Z",
            updatedAt: "2025-05-10T14:30:00Z"
        )
        let client2 = Client(
            id: "cli_456",
            userId: "user_789",
            name: "Client B",
            phone: "5551234567",
            totalEvents: 1,
            createdAt: "2025-01-15T09:00:00Z",
            updatedAt: "2025-05-10T14:30:00Z"
        )
        
        var set: Set<Client> = []
        set.insert(client1)
        set.insert(client2)
        
        XCTAssertEqual(set.count, 2)
    }
    
    // MARK: - Round-trip Tests
    
    func testClientEncodeDecode() {
        let original = Client(
            id: "cli_999",
            userId: "user_555",
            name: "Round Trip Client",
            phone: "5557777777",
            email: "roundtrip@example.com",
            address: "999 Test Ln",
            city: "Test City",
            notes: "Test notes",
            photoUrl: "https://example.com/roundtrip.jpg",
            totalEvents: 10,
            totalSpent: 50000.00,
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-05-10T15:00:00Z"
        )
        
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let encoded = try! encoder.encode(original)
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let decoded = try! decoder.decode(Client.self, from: encoded)
        
        XCTAssertEqual(decoded.id, original.id)
        XCTAssertEqual(decoded.name, original.name)
        XCTAssertEqual(decoded.email, original.email)
        XCTAssertEqual(decoded.totalEvents, original.totalEvents)
        XCTAssertEqual(decoded.totalSpent, original.totalSpent)
    }
    
    func testClientEncodeDcodeWithoutOptionals() {
        let original = Client(
            id: "cli_minimal",
            userId: "user_minimal",
            name: "Minimal Client",
            phone: "5551111111",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-05-10T15:00:00Z"
        )
        
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let encoded = try! encoder.encode(original)
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let decoded = try! decoder.decode(Client.self, from: encoded)
        
        XCTAssertEqual(decoded.id, original.id)
        XCTAssertEqual(decoded.name, original.name)
        XCTAssertNil(decoded.email)
        XCTAssertNil(decoded.totalEvents)
    }
}
