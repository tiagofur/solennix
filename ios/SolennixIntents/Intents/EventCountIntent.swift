import AppIntents
import SwiftUI
import SolennixDesign

// MARK: - Event Count Intent

struct EventCountIntent: AppIntent {

    static var title: LocalizedStringResource = "intent.count.title"
    static var description = IntentDescription("intent.count.desc")

    static var openAppWhenRun: Bool = false

    @Parameter(title: "intent.count.param.period", default: .thisWeek)
    var period: EventPeriod

    func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView {
        guard IntentSharedDataStore.hasProAccess else {
            return .result(
                dialog: IntentDialog(stringLiteral: String(localized: "intent.dialog.pro_required")),
                view: PlanRequiredSnippetView()
            )
        }

        let counts = await fetchEventCounts()

        let count: Int
        let periodKey: String

        switch period {
        case .today:
            count = counts.today
            periodKey = "today"
        case .thisWeek:
            count = counts.thisWeek
            periodKey = "week"
        case .thisMonth:
            count = counts.thisMonth
            periodKey = "month"
        }

        let dialog: String
        if count == 0 {
            dialog = NSLocalizedString("intent.count.dialog.none.\(periodKey)", comment: "")
        } else if count == 1 {
            dialog = NSLocalizedString("intent.count.dialog.one.\(periodKey)", comment: "")
        } else {
            dialog = String(format: NSLocalizedString("intent.count.dialog.many_fmt.\(periodKey)", comment: ""), count)
        }

        return .result(
            dialog: IntentDialog(stringLiteral: dialog),
            view: EventCountSnippetView(counts: counts, selectedPeriod: period)
        )
    }

    private func fetchEventCounts() async -> EventCounts {
        let events = IntentSharedDataStore.loadUpcomingEvents()
        let calendar = Calendar.current
        let now = Date()
        let weekInterval = calendar.dateInterval(of: .weekOfYear, for: now)

        let today = events.filter { calendar.isDateInToday($0.eventDate) }.count
        let thisWeek = events.filter { event in
            guard let interval = weekInterval else { return false }
            return interval.contains(event.eventDate)
        }.count
        let thisMonth = events.filter { calendar.isDate($0.eventDate, equalTo: now, toGranularity: .month) }.count
        let confirmed = events.filter { $0.status == "confirmed" }.count
        let quoted = events.filter { $0.status == "quoted" }.count

        return EventCounts(
            today: today,
            thisWeek: thisWeek,
            thisMonth: thisMonth,
            confirmed: confirmed,
            quoted: quoted
        )
    }
}

// MARK: - Event Period Enum

enum EventPeriod: String, AppEnum {
    case today = "hoy"
    case thisWeek = "esta_semana"
    case thisMonth = "este_mes"

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "intent.period.typename")

    static var caseDisplayRepresentations: [EventPeriod: DisplayRepresentation] = [
        .today: "intent.period.today",
        .thisWeek: "intent.period.this_week",
        .thisMonth: "intent.period.this_month"
    ]
}

// MARK: - Event Counts Model

struct EventCounts {
    let today: Int
    let thisWeek: Int
    let thisMonth: Int
    let confirmed: Int
    let quoted: Int
}

// MARK: - Snippet View

struct EventCountSnippetView: View {
    let counts: EventCounts
    let selectedPeriod: EventPeriod

    // MARK: - @ScaledMetric sizes (Dynamic Type-safe, capped)
    @ScaledMetric(relativeTo: .largeTitle) private var countFontSize: CGFloat = 48
    private var cappedCountFontSize: CGFloat { min(countFontSize, 64) }
    @ScaledMetric(relativeTo: .body) private var countIconSize: CGFloat = 40
    private var cappedCountIconSize: CGFloat { min(countIconSize, 56) }

    var body: some View {
        VStack(spacing: 16) {
            // Main count
            HStack {
                VStack(alignment: .leading) {
                    Text(periodLabel)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text("\(selectedCount)")
                        .font(.system(size: cappedCountFontSize, weight: .bold, design: .rounded))
                        .foregroundStyle(SolennixColors.primary)

                    Text(verbatim: selectedCount == 1 ? String(localized: "intent.count.snippet.event_singular") : String(localized: "intent.count.snippet.event_plural"))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "calendar")
                    .font(.system(size: cappedCountIconSize))
                    .foregroundStyle(SolennixColors.primary.opacity(0.3))
            }

            Divider()

            // Breakdown
            HStack(spacing: 24) {
                countBadge(label: String(localized: "intent.count.snippet.confirmed"), count: counts.confirmed, color: .green)
                countBadge(label: String(localized: "intent.count.snippet.quoted"), count: counts.quoted, color: .orange)
            }
        }
        .padding()
    }

    private var selectedCount: Int {
        switch selectedPeriod {
        case .today: return counts.today
        case .thisWeek: return counts.thisWeek
        case .thisMonth: return counts.thisMonth
        }
    }

    private var periodLabel: String {
        switch selectedPeriod {
        case .today: return String(localized: "intent.period.today")
        case .thisWeek: return String(localized: "intent.period.this_week")
        case .thisMonth: return String(localized: "intent.period.this_month")
        }
    }

    private func countBadge(label: String, count: Int, color: Color) -> some View {
        VStack(spacing: 4) {
            Text("\(count)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(color)

            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}
