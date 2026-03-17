import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Event Activity Attributes

struct EventActivityAttributes: ActivityAttributes {

    // Static content (doesn't change during the activity)
    public struct ContentState: Codable, Hashable {
        var eventName: String
        var clientName: String
        var eventType: String
        var hoursRemaining: Double
        var minutesRemaining: Int
        var checklistProgress: Double
        var guestCount: Int
        var pendingPayment: Double
    }

    // Dynamic content
    var eventId: String
    var startTime: Date
    var endTime: Date
    var location: String
}

// MARK: - Event Live Activity Widget

struct EventLiveActivity: Widget {
    let kind: String = "EventLiveActivity"

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: EventActivityAttributes.self) { context in
            // Lock Screen / Banner UI
            LockScreenLiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI - Leading
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(context.attributes.location)
                            .font(.caption2)
                            .foregroundStyle(.secondary)

                        HStack(spacing: 4) {
                            Image(systemName: "person.2")
                                .font(.caption2)
                            Text("\(context.state.guestCount)")
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                    }
                    .padding(.leading, 4)
                }

                // Expanded UI - Trailing
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        // Time remaining
                        if context.state.hoursRemaining > 0 {
                            Text("\(Int(context.state.hoursRemaining))h \(context.state.minutesRemaining)m")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.orange)
                        } else {
                            Text("\(context.state.minutesRemaining)m")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.red)
                        }

                        Text("restante")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.trailing, 4)
                }

                // Expanded UI - Center
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 2) {
                        Text(context.state.clientName)
                            .font(.headline)
                            .lineLimit(1)

                        Text(context.state.eventType)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                // Expanded UI - Bottom
                DynamicIslandExpandedRegion(.bottom) {
                    HStack(spacing: 16) {
                        // Checklist progress
                        VStack(spacing: 4) {
                            ProgressView(value: context.state.checklistProgress)
                                .tint(.green)

                            Text("Checklist: \(Int(context.state.checklistProgress * 100))%")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }

                        // Payment status
                        if context.state.pendingPayment > 0 {
                            VStack(spacing: 2) {
                                Image(systemName: "dollarsign.circle")
                                    .font(.title3)
                                    .foregroundStyle(.orange)

                                Text(formatCurrency(context.state.pendingPayment))
                                    .font(.caption2)
                                    .foregroundStyle(.orange)
                            }
                        } else {
                            VStack(spacing: 2) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.title3)
                                    .foregroundStyle(.green)

                                Text("Pagado")
                                    .font(.caption2)
                                    .foregroundStyle(.green)
                            }
                        }
                    }
                    .padding(.top, 8)
                }
            } compactLeading: {
                // Compact leading - Timer icon
                Image(systemName: "timer")
                    .foregroundStyle(.orange)
            } compactTrailing: {
                // Compact trailing - Time remaining
                if context.state.hoursRemaining > 0 {
                    Text("\(Int(context.state.hoursRemaining))h")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.orange)
                } else {
                    Text("\(context.state.minutesRemaining)m")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.red)
                }
            } minimal: {
                // Minimal - Just an icon
                Image(systemName: "calendar.badge.clock")
                    .foregroundStyle(.orange)
            }
        }
    }

    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "MXN"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "$0"
    }
}

// MARK: - Lock Screen Live Activity View

struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<EventActivityAttributes>

    var body: some View {
        HStack(spacing: 16) {
            // Left: Event info
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Image(systemName: "calendar.badge.clock")
                        .foregroundStyle(.orange)

                    Text("Evento Activo")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.orange)
                }

                Text(context.state.clientName)
                    .font(.headline)

                HStack(spacing: 8) {
                    Text(context.state.eventType)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text("•")
                        .foregroundStyle(.secondary)

                    Text(context.attributes.location)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            // Right: Time remaining
            VStack(alignment: .trailing, spacing: 4) {
                if context.state.hoursRemaining > 0 {
                    Text("\(Int(context.state.hoursRemaining))h \(context.state.minutesRemaining)m")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundStyle(.orange)
                } else {
                    Text("\(context.state.minutesRemaining) min")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundStyle(.red)
                }

                Text("restante")
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                // Checklist progress bar
                ProgressView(value: context.state.checklistProgress)
                    .tint(.green)
                    .frame(width: 60)
            }
        }
        .padding()
        .activityBackgroundTint(.black.opacity(0.8))
        .activitySystemActionForegroundColor(.white)
    }
}

// MARK: - Live Activity Manager

@MainActor
final class EventLiveActivityManager {

    static let shared = EventLiveActivityManager()

    private var currentActivity: Activity<EventActivityAttributes>?
    private var updateTask: Task<Void, Never>?

    private init() {}

    deinit {
        updateTask?.cancel()
    }

    // MARK: - Start Activity

    func startEventActivity(
        eventId: String,
        clientName: String,
        eventType: String,
        startTime: Date,
        endTime: Date,
        location: String,
        guestCount: Int,
        pendingPayment: Double
    ) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            print("Live Activities are not enabled")
            return
        }

        let attributes = EventActivityAttributes(
            eventId: eventId,
            startTime: startTime,
            endTime: endTime,
            location: location
        )

        let timeRemaining = endTime.timeIntervalSince(Date())
        let hours = timeRemaining / 3600
        let minutes = Int(timeRemaining.truncatingRemainder(dividingBy: 3600) / 60)

        let state = EventActivityAttributes.ContentState(
            eventName: "\(clientName) - \(eventType)",
            clientName: clientName,
            eventType: eventType,
            hoursRemaining: hours,
            minutesRemaining: minutes,
            checklistProgress: 0.0,
            guestCount: guestCount,
            pendingPayment: pendingPayment
        )

        do {
            let activity = try Activity.request(
                attributes: attributes,
                content: .init(state: state, staleDate: nil),
                pushType: nil
            )
            currentActivity = activity
            print("Started Live Activity: \(activity.id)")
        } catch {
            print("Error starting Live Activity: \(error)")
        }
    }

    // MARK: - Update Activity

    func updateEventActivity(
        checklistProgress: Double,
        hoursRemaining: Double,
        minutesRemaining: Int,
        pendingPayment: Double
    ) {
        // Cancel any pending update to avoid race conditions
        updateTask?.cancel()

        updateTask = Task {
            guard let activity = currentActivity else { return }

            let updatedState = EventActivityAttributes.ContentState(
                eventName: activity.content.state.eventName,
                clientName: activity.content.state.clientName,
                eventType: activity.content.state.eventType,
                hoursRemaining: hoursRemaining,
                minutesRemaining: minutesRemaining,
                checklistProgress: checklistProgress,
                guestCount: activity.content.state.guestCount,
                pendingPayment: pendingPayment
            )

            await activity.update(
                ActivityContent(state: updatedState, staleDate: nil)
            )
        }
    }

    // MARK: - End Activity

    func endEventActivity() async {
        guard let activity = currentActivity else { return }

        let finalState = EventActivityAttributes.ContentState(
            eventName: activity.content.state.eventName,
            clientName: activity.content.state.clientName,
            eventType: activity.content.state.eventType,
            hoursRemaining: 0,
            minutesRemaining: 0,
            checklistProgress: 1.0,
            guestCount: activity.content.state.guestCount,
            pendingPayment: 0
        )

        await activity.end(
            ActivityContent(state: finalState, staleDate: nil),
            dismissalPolicy: .default
        )

        currentActivity = nil
    }
}
