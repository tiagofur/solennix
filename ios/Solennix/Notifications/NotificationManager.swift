import Foundation
import UserNotifications
import UIKit
import SolennixCore

// MARK: - Notification Manager

@MainActor
final class NotificationManager: NSObject, ObservableObject {

    static let shared = NotificationManager()

    @Published var isAuthorized: Bool = false
    @Published var deviceToken: String?

    private override init() {
        super.init()
    }

    func configureCategories() {
        let viewEvent = UNNotificationAction(
            identifier: NotificationAction.viewEvent.rawValue,
            title: "Ver evento",
            options: [.foreground]
        )
        let viewPayment = UNNotificationAction(
            identifier: NotificationAction.viewPayment.rawValue,
            title: "Ver pago",
            options: [.foreground]
        )
        let viewInventory = UNNotificationAction(
            identifier: NotificationAction.viewInventory.rawValue,
            title: "Ver inventario",
            options: [.foreground]
        )

        let eventCategory = UNNotificationCategory(
            identifier: NotificationCategory.event.rawValue,
            actions: [viewEvent],
            intentIdentifiers: [],
            options: []
        )
        let paymentCategory = UNNotificationCategory(
            identifier: NotificationCategory.payment.rawValue,
            actions: [viewPayment],
            intentIdentifiers: [],
            options: []
        )
        let inventoryCategory = UNNotificationCategory(
            identifier: NotificationCategory.inventory.rawValue,
            actions: [viewInventory],
            intentIdentifiers: [],
            options: []
        )

        UNUserNotificationCenter.current().setNotificationCategories([eventCategory, paymentCategory, inventoryCategory])
    }

    // MARK: - Request Authorization

    func requestAuthorization() async -> Bool {
        do {
            let options: UNAuthorizationOptions = [.alert, .badge, .sound]
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: options)
            isAuthorized = granted

            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }

            return granted
        } catch {
            print("Notification authorization error: \(error)")
            return false
        }
    }

    // MARK: - Check Current Status

    func checkAuthorizationStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        isAuthorized = settings.authorizationStatus == .authorized
    }

    // MARK: - Register Device Token

    func registerDeviceToken(_ token: Data) {
        let tokenString = token.map { String(format: "%02.2hhx", $0) }.joined()
        deviceToken = tokenString
        print("Device token: \(tokenString)")

        // Send to backend
        Task {
            await sendTokenToBackend(tokenString)
        }
    }

    private func sendTokenToBackend(_ token: String) async {
        // Store token in UserDefaults for retry if registration fails
        UserDefaults.standard.set(token, forKey: "pendingDeviceToken")

        // Post notification for the app to handle registration via APIClient
        await MainActor.run {
            NotificationCenter.default.post(
                name: .deviceTokenReceived,
                object: nil,
                userInfo: ["token": token, "platform": "ios"]
            )
        }
    }

    // MARK: - Schedule Local Notification

    func scheduleEventReminder(
        eventId: String,
        clientName: String,
        eventType: String,
        eventDate: Date,
        reminderType: ReminderType
    ) async {
        let triggerDate = Calendar.current.date(
            byAdding: reminderType.offset,
            to: eventDate
        ) ?? eventDate
        guard triggerDate > Date() else { return }

        let content = UNMutableNotificationContent()
        content.title = reminderType.title
        content.body = "\(clientName) - \(eventType)"
        content.sound = .default
        content.badge = 1
        content.userInfo = [
            "event_id": eventId,
            "type": "event_reminder"
        ]
        content.categoryIdentifier = NotificationCategory.event.rawValue

        let components = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: triggerDate
        )

        let trigger = UNCalendarNotificationTrigger(
            dateMatching: components,
            repeats: false
        )

        let request = UNNotificationRequest(
            identifier: "\(eventId)_\(reminderType.rawValue)",
            content: content,
            trigger: trigger
        )

        do {
            try await UNUserNotificationCenter.current().add(request)
            print("Scheduled \(reminderType.rawValue) reminder for event \(eventId)")
        } catch {
            print("Error scheduling notification: \(error)")
        }
    }

    // MARK: - Cancel Notifications

    func cancelEventReminders(eventId: String) {
        let identifiers = ReminderType.allCases.map { "\(eventId)_\($0.rawValue)" }
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: identifiers)
    }

    func cancelAllPendingNotifications() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }

    // MARK: - Sync Upcoming Event Reminders

    func syncUpcomingEventReminders(events: [Event], clientNamesById: [String: String]) async {
        guard isAuthorized else { return }

        let pendingRequests = await UNUserNotificationCenter.current().pendingNotificationRequests()
        let eventIds = Set(events.map(\.id))

        let staleIdentifiers = pendingRequests
            .filter {
                guard let eventId = Self.extractEventId(fromIdentifier: $0.identifier) else { return false }
                return !eventIds.contains(eventId)
            }
            .map(\.identifier)

        if !staleIdentifiers.isEmpty {
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: staleIdentifiers)
        }

        for event in events where event.status == .confirmed {
            guard let eventDate = Self.resolveEventDate(for: event), eventDate > Date() else { continue }

            let clientName = clientNamesById[event.clientId] ?? "Cliente"
            cancelEventReminders(eventId: event.id)
            for reminderType in ReminderType.allCases {
                await scheduleEventReminder(
                    eventId: event.id,
                    clientName: clientName,
                    eventType: event.serviceType,
                    eventDate: eventDate,
                    reminderType: reminderType
                )
            }
        }
    }

    // MARK: - Get Pending Notifications

    func getPendingNotifications() async -> [UNNotificationRequest] {
        await UNUserNotificationCenter.current().pendingNotificationRequests()
    }

    private static func extractEventId(fromIdentifier identifier: String) -> String? {
        let suffix = "_\(ReminderType.oneDay.rawValue)"
        if identifier.hasSuffix(suffix) {
            return String(identifier.dropLast(suffix.count))
        }
        let suffixOneHour = "_\(ReminderType.oneHour.rawValue)"
        if identifier.hasSuffix(suffixOneHour) {
            return String(identifier.dropLast(suffixOneHour.count))
        }
        let suffixThirty = "_\(ReminderType.thirtyMinutes.rawValue)"
        if identifier.hasSuffix(suffixThirty) {
            return String(identifier.dropLast(suffixThirty.count))
        }
        return nil
    }

    private static func resolveEventDate(for event: Event) -> Date? {
        let eventDatePrefix = String(event.eventDate.prefix(10))
        let parts = eventDatePrefix.split(separator: "-")
        guard parts.count == 3,
              let year = Int(parts[0]),
              let month = Int(parts[1]),
              let day = Int(parts[2]) else {
            return nil
        }

        var hour = 9
        var minute = 0
        if let startTime = event.startTime {
            let normalized = String(startTime.prefix(5))
            let timeParts = normalized.split(separator: ":")
            if timeParts.count >= 2 {
                hour = Int(timeParts[0]) ?? hour
                minute = Int(timeParts[1]) ?? minute
            }
        }

        var components = DateComponents()
        components.calendar = Calendar.current
        components.timeZone = TimeZone.current
        components.year = year
        components.month = month
        components.day = day
        components.hour = hour
        components.minute = minute
        return components.date
    }
}

// MARK: - Reminder Type

enum ReminderType: String, CaseIterable {
    case oneDay = "one_day"
    case oneHour = "one_hour"
    case thirtyMinutes = "thirty_minutes"

    var title: String {
        switch self {
        case .oneDay:
            return "Evento manana"
        case .oneHour:
            return "Evento en 1 hora"
        case .thirtyMinutes:
            return "Evento en 30 minutos"
        }
    }

    var offset: DateComponents {
        switch self {
        case .oneDay:
            return DateComponents(day: -1)
        case .oneHour:
            return DateComponents(hour: -1)
        case .thirtyMinutes:
            return DateComponents(minute: -30)
        }
    }
}

// MARK: - Notification Delegate

extension NotificationManager: UNUserNotificationCenterDelegate {

    // Handle notifications when app is in foreground
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        return [.banner, .badge, .sound]
    }

    // Handle notification tap
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo
        let action = response.actionIdentifier
        if let route = routeFromNotification(userInfo: userInfo, actionIdentifier: action) {
            await MainActor.run {
                NotificationCenter.default.post(
                    name: .spotlightNavigationRequested,
                    object: nil,
                    userInfo: ["route": route]
                )
            }
        }
    }

    private nonisolated func routeFromNotification(userInfo: [AnyHashable: Any], actionIdentifier: String) -> Route? {
        let eventId = userInfo["event_id"] as? String
        let typeRaw = userInfo["type"] as? String

        switch actionIdentifier {
        case NotificationAction.viewPayment.rawValue:
            if let eventId, !eventId.isEmpty { return .eventPayments(id: eventId) }
        case NotificationAction.viewInventory.rawValue:
            return .inventoryList
        case NotificationAction.viewEvent.rawValue, UNNotificationDefaultActionIdentifier:
            break
        default:
            break
        }

        guard let typeRaw, let type = PushNotificationType(rawValue: typeRaw) else {
            if let eventId, !eventId.isEmpty { return .eventDetail(id: eventId) }
            return nil
        }

        switch type {
        case .eventReminder, .eventConfirmed, .eventCancelled:
            if let eventId, !eventId.isEmpty { return .eventDetail(id: eventId) }
            return .eventList
        case .paymentReceived:
            if let eventId, !eventId.isEmpty { return .eventPayments(id: eventId) }
            return .eventList
        case .lowStock:
            return .inventoryList
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let paymentReceived = Notification.Name("paymentReceived")
    static let lowStockAlert = Notification.Name("lowStockAlert")
    static let deviceTokenReceived = Notification.Name("deviceTokenReceived")
}

enum NotificationCategory: String {
    case event = "EVENT_CATEGORY"
    case payment = "PAYMENT_CATEGORY"
    case inventory = "INVENTORY_CATEGORY"
}

enum NotificationAction: String {
    case viewEvent = "VIEW_EVENT"
    case viewPayment = "VIEW_PAYMENT"
    case viewInventory = "VIEW_INVENTORY"
}

// MARK: - Push Notification Types

enum PushNotificationType: String, Codable {
    case eventReminder = "event_reminder"
    case paymentReceived = "payment_received"
    case lowStock = "low_stock"
    case eventConfirmed = "event_confirmed"
    case eventCancelled = "event_cancelled"
}

// MARK: - Push Notification Payload

struct PushNotificationPayload: Codable {
    let type: PushNotificationType
    let title: String
    let body: String
    let eventId: String?
    let paymentId: String?
    let inventoryItemId: String?
    let badge: Int?

    enum CodingKeys: String, CodingKey {
        case type
        case title
        case body
        case eventId = "event_id"
        case paymentId = "payment_id"
        case inventoryItemId = "inventory_item_id"
        case badge
    }
}
