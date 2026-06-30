import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - MonthNavigatorView

/// Reusable month-navigation header: prev/next chevrons + a "Hoy" (today)
/// affordance, driven purely via closures. Extracted verbatim in look/feel from
/// `EventListView`'s inline header so the events list and the event-form date
/// picker share one presentational component (DRY — AGENTS.md hard rule).
///
/// The closures own the side effects (haptics + state mutation); this view
/// carries no business state. a11y labels resolve the shared
/// `events.calendar.*` keys so VoiceOver behavior is identical across
/// consumers.
public struct MonthNavigatorView: View {

    let title: String
    let onPrev: () -> Void
    let onNext: () -> Void
    let onToday: () -> Void

    public init(
        title: String,
        onPrev: @escaping () -> Void,
        onNext: @escaping () -> Void,
        onToday: @escaping () -> Void
    ) {
        self.title = title
        self.onPrev = onPrev
        self.onNext = onNext
        self.onToday = onToday
    }

    public var body: some View {
        VStack(spacing: Spacing.sm) {
            HStack {
                Button(action: onPrev) {
                    Image(systemName: "chevron.left")
                        .font(.headline)
                        .foregroundStyle(SolennixColors.primary)
                }
                .accessibilityLabel(tr("events.calendar.previous_month", "Mes anterior"))

                Spacer()

                Text(title)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)

                Spacer()

                Button(action: onNext) {
                    Image(systemName: "chevron.right")
                        .font(.headline)
                        .foregroundStyle(SolennixColors.primary)
                }
                .accessibilityLabel(tr("events.calendar.next_month", "Mes siguiente"))
            }

            // "Hoy" affordance — snaps the grid back to the current month.
            Button(action: onToday) {
                Text(tr("events.calendar.today", "Hoy"))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.primary)
            }
            .accessibilityLabel(tr("events.calendar.today", "Hoy"))
        }
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }
}
