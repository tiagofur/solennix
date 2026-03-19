import Foundation
import SwiftData

// MARK: - CachedEvent

/// SwiftData model mirroring the `Event` struct for offline caching.
@Model
public final class CachedEvent {

    // MARK: - Properties

    @Attribute(.unique)
    public var id: String

    public var userId: String
    public var clientId: String
    public var eventDate: String
    public var startTime: String?
    public var endTime: String?
    public var serviceType: String
    public var numPeople: Int
    public var statusRawValue: String
    public var discount: Double
    public var discountTypeRawValue: String
    public var requiresInvoice: Bool
    public var taxRate: Double
    public var taxAmount: Double
    public var totalAmount: Double
    public var location: String?
    public var city: String?
    public var depositPercent: Double?
    public var cancellationDays: Double?
    public var refundPercent: Double?
    public var notes: String?
    public var photos: String?
    public var createdAt: String
    public var updatedAt: String

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
        statusRawValue: String,
        discount: Double,
        discountTypeRawValue: String,
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
        self.statusRawValue = statusRawValue
        self.discount = discount
        self.discountTypeRawValue = discountTypeRawValue
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

    /// Creates a cached version from an `Event` struct.
    public convenience init(from event: Event) {
        self.init(
            id: event.id,
            userId: event.userId,
            clientId: event.clientId,
            eventDate: event.eventDate,
            startTime: event.startTime,
            endTime: event.endTime,
            serviceType: event.serviceType,
            numPeople: event.numPeople,
            statusRawValue: event.status.rawValue,
            discount: event.discount,
            discountTypeRawValue: event.discountType.rawValue,
            requiresInvoice: event.requiresInvoice,
            taxRate: event.taxRate,
            taxAmount: event.taxAmount,
            totalAmount: event.totalAmount,
            location: event.location,
            city: event.city,
            depositPercent: event.depositPercent,
            cancellationDays: event.cancellationDays,
            refundPercent: event.refundPercent,
            notes: event.notes,
            photos: event.photos,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
        )
    }

    // MARK: - Conversion

    /// Converts this cached model back to an `Event` value type.
    public func toEvent() -> Event {
        Event(
            id: id,
            userId: userId,
            clientId: clientId,
            eventDate: eventDate,
            startTime: startTime,
            endTime: endTime,
            serviceType: serviceType,
            numPeople: numPeople,
            status: EventStatus(rawValue: statusRawValue) ?? .quoted,
            discount: discount,
            discountType: DiscountType(rawValue: discountTypeRawValue) ?? .percent,
            requiresInvoice: requiresInvoice,
            taxRate: taxRate,
            taxAmount: taxAmount,
            totalAmount: totalAmount,
            location: location,
            city: city,
            depositPercent: depositPercent,
            cancellationDays: cancellationDays,
            refundPercent: refundPercent,
            notes: notes,
            photos: photos,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}
