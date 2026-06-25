import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - EventListPeriodFilterBar (task 4.5, ADR-8)

/// The period-filter chip row `Hoy · Esta semana · Este mes · Personalizado`
/// for the unified Eventos header. Visible in BOTH `.lista` and `.calendario`
/// modes — the chips drive the shared `dateRange*` filter from task 3.3, so a
/// chip and a calendar day-tap are mutually exclusive against the SAME surface
/// (ADR-7). The active chip (the ViewModel's `periodFilter`) is highlighted.
///
/// Every tap routes through the stateless `EventListPeriodFilterActions` seam
/// (mirrors `EventosViewModeToggle` / `EventListCalendarGestures`), so the
/// chip→setter binding is verified independently of SwiftUI gesture driving.
///
/// Styling matches the app's existing `CategoryChip` (caption + semibold, 44pt
/// min touch target, `Capsule()`, `SolennixColors.primary` fill when selected).
struct EventListPeriodFilterBar: View {

    @Bindable var viewModel: EventListViewModel

    /// Fired when the user taps `Personalizado` so the host view can present the
    /// start-then-end custom-range picker. Passed straight into the seam as the
    /// `presentCustomRangePicker` closure (the seam holds no presentation state).
    let onRequestCustomRange: () -> Void

    private var actions: EventListPeriodFilterActions {
        EventListPeriodFilterActions(
            viewModel: viewModel,
            presentCustomRangePicker: onRequestCustomRange
        )
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.xs) {
                ForEach(periodChips, id: \.filter) { chip in
                    periodChip(chip)
                }
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    // MARK: - Chip model + labels

    /// Chip → localized label. Order follows `EventPeriodFilter.allCases`
    /// (pinned by 3.3), which matches the spec's
    /// `Hoy · Esta semana · Este mes · Personalizado`.
    private struct PeriodChip: Hashable {
        let filter: EventPeriodFilter
        let title: String
    }

    private var periodChips: [PeriodChip] {
        [
            .init(filter: .today,     title: FeatureL10n.text("events.list.period.today", "Hoy")),
            .init(filter: .thisWeek,  title: FeatureL10n.text("events.list.period.this_week", "Esta semana")),
            .init(filter: .thisMonth, title: FeatureL10n.text("events.list.period.this_month", "Este mes")),
            .init(filter: .custom,    title: FeatureL10n.text("events.list.period.custom", "Personalizado"))
        ]
    }

    @ViewBuilder
    private func periodChip(_ chip: PeriodChip) -> some View {
        let isSelected = viewModel.periodFilter == chip.filter
        Button {
            actions.selectChip(chip.filter)
        } label: {
            Text(chip.title)
                .font(.caption)
                .fontWeight(.semibold)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, 6)
                // 44pt minimum touch target + Rectangle content shape so the
                // whole capsule is tappable (visual stays Capsule). Mirrors
                // CategoryChip's accessibility fix.
                .frame(minHeight: 44)
                .contentShape(Rectangle())
                .background(isSelected ? SolennixColors.primary : SolennixColors.card)
                .foregroundStyle(isSelected ? Color.white : SolennixColors.textSecondary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
