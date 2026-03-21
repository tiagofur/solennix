import Foundation

// MARK: - EventStatus

public enum EventStatus: String, Codable, Sendable, CaseIterable, Hashable {
    case quoted
    case confirmed
    case completed
    case cancelled
}

// MARK: - DiscountType

public enum DiscountType: String, Codable, Sendable, CaseIterable, Hashable {
    case percent
    case fixed
}

// MARK: - Event

public struct Event: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let userId: String
    public let clientId: String
    public let eventDate: String
    public var startTime: String?
    public var endTime: String?
    public let serviceType: String
    public let numPeople: Int
    public let status: EventStatus
    public let discount: Double
    public let discountType: DiscountType
    public let requiresInvoice: Bool
    public let taxRate: Double
    public let taxAmount: Double
    public let totalAmount: Double
    public var location: String?
    public var city: String?
    public var depositPercent: Double?
    public var cancellationDays: Double?
    public var refundPercent: Double?
    public var notes: String?
    public var photos: String?
    public let createdAt: String
    public let updatedAt: String

    // MARK: - Init

    public init(
        id: String,
        userId: String,
        clientId: String,
        eventDate: String,
        startTime: String? = nil,
        endTime: String? = nil,
        serviceType: String,
        numPeople: Int,
        status: EventStatus,
        discount: Double,
        discountType: DiscountType,
        requiresInvoice: Bool,
        taxRate: Double,
        taxAmount: Double,
        totalAmount: Double,
        location: String? = nil,
        city: String? = nil,
        depositPercent: Double? = nil,
        cancellationDays: Double? = nil,
        refundPercent: Double? = nil,
        notes: String? = nil,
        photos: String? = nil,
        createdAt: String,
        updatedAt: String
    ) {
        self.id = id
        self.userId = userId
        self.clientId = clientId
        self.eventDate = eventDate
        self.startTime = startTime
        self.endTime = endTime
        self.serviceType = serviceType
        self.numPeople = numPeople
        self.status = status
        self.discount = discount
        self.discountType = discountType
        self.requiresInvoice = requiresInvoice
        self.taxRate = taxRate
        self.taxAmount = taxAmount
        self.totalAmount = totalAmount
        self.location = location
        self.city = city
        self.depositPercent = depositPercent
        self.cancellationDays = cancellationDays
        self.refundPercent = refundPercent
        self.notes = notes
        self.photos = photos
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
