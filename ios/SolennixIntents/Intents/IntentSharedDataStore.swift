import Foundation
import SwiftUI

enum IntentSharedDataStore {
    private static let appGroupID = "group.com.solennix.app"
    private static let eventsKey = "widget_upcoming_events"
    private static let kpisKey = "widget_kpis"
    private static let userPlanKey = "widget_user_plan"

    static func loadUpcomingEvents() -> [IntentWidgetEvent] {
        guard let defaults = UserDefaults(suiteName: appGroupID),
              let data = defaults.data(forKey: eventsKey) else {
            return []
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return (try? decoder.decode([IntentWidgetEvent].self, from: data)) ?? []
    }

    static func loadKPIs() -> IntentWidgetKPIs? {
        guard let defaults = UserDefaults(suiteName: appGroupID),
              let data = defaults.data(forKey: kpisKey) else {
            return nil
        }

        return try? JSONDecoder().decode(IntentWidgetKPIs.self, from: data)
    }

    static func loadUserPlan() -> String? {
        guard let defaults = UserDefaults(suiteName: appGroupID) else {
            return nil
        }
        return defaults.string(forKey: userPlanKey)
    }

    static var hasProAccess: Bool {
        guard let plan = loadUserPlan()?.lowercased() else {
            return false
        }
        return plan == "pro" || plan == "business" || plan == "premium"
    }
}

struct IntentWidgetEvent: Codable, Identifiable {
    let id: String
    let clientName: String
    let eventType: String
    let eventDate: Date
    let startTime: String?
    let location: String?
    let guestCount: Int?
    let status: String
    let totalAmount: Double?

    var isToday: Bool {
        Calendar.current.isDateInToday(eventDate)
    }

    var formattedDate: String {
        if Calendar.current.isDateInToday(eventDate) {
            return "Hoy"
        }
        if Calendar.current.isDateInTomorrow(eventDate) {
            return "Manana"
        }

        let formatter = DateFormatter()
        formatter.dateFormat = "d MMM"
        formatter.locale = Locale(identifier: "es_MX")
        return formatter.string(from: eventDate)
    }
}

struct IntentWidgetKPIs: Codable {
    let monthlyRevenue: Double
    let eventsThisMonth: Int
    let eventsThisWeek: Int
    let lowStockCount: Int
    let pendingPayments: Double
    let confirmedEvents: Int
    let quotedEvents: Int
}

struct PlanRequiredSnippetView: View {
    @ScaledMetric(relativeTo: .body) private var lockIconSize: CGFloat = 30
    private var cappedLockIconSize: CGFloat { min(lockIconSize, 44) }

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: "lock.shield")
                .font(.system(size: cappedLockIconSize))
                .foregroundStyle(.orange)

            Text("Plan Pro requerido")
                .font(.headline)

            Text("Actualiza tu plan para usar este atajo de voz.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}