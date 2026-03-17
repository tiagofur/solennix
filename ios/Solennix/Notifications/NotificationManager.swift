import Foundation
import UserNotifications
import UIKit

// MARK: - Notification Manager

@MainActor
final class NotificationManager: NSObject, ObservableObject {

    static let shared = NotificationManager()

    @Published var isAuthorized: Bool = false
    @Published var deviceToken: String?

    private override init() {
        super.init()
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
        let content = UNMutableNotificationContent()
        content.title = reminderType.title
        content.body = "\(clientName) - \(eventType)"
        content.sound = .default
        content.badge = 1
        content.userInfo = [
            "event_id": eventId,
            "type": "event_reminder"
        ]

        let triggerDate = Calendar.current.date(
            byAdding: reminderType.offset,
            to: eventDate
        ) ?? eventDate

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

    // MARK: - Get Pending Notifications

    func getPendingNotifications() async -> [UNNotificationRequest] {
        await UNUserNotificationCenter.current().pendingNotificationRequests()
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

        if let eventId = userInfo["event_id"] as? String {
            // Navigate to event detail
            await MainActor.run {
                NotificationCenter.default.post(
                    name: .navigateToEvent,
                    object: nil,
                    userInfo: ["event_id": eventId]
                )
            }
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let navigateToEvent = Notification.Name("navigateToEvent")
    static let paymentReceived = Notification.Name("paymentReceived")
    static let lowStockAlert = Notification.Name("lowStockAlert")
    static let deviceTokenReceived = Notification.Name("deviceTokenReceived")
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
