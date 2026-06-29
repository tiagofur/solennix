import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

private func tr(_ key: String, _ value: String) -> String {
    FeatureL10n.text(key, value)
}

// MARK: - Event Checklist View

public struct EventChecklistView: View {

    let eventId: String

    @State private var viewModel: EventChecklistViewModel
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(eventId: String, apiClient: APIClient) {
        self.eventId = eventId
        self._viewModel = State(initialValue: EventChecklistViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.items.isEmpty {
                ProgressView(tr("events.checklist.loading", "Cargando checklist..."))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.items.isEmpty && !viewModel.isLoading {
                ContentUnavailableView {
                    Label(tr("events.checklist.empty_title", "Sin elementos"), systemImage: "checklist")
                } description: {
                    Text(tr("events.checklist.empty_message", "Este evento no tiene elementos para el checklist"))
                }
            } else {
                scrollContent
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(tr("events.checklist.title", "Checklist de Carga"))
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.loadChecklist(eventId: eventId) }
    }

    // MARK: - Scroll Content

    private var scrollContent: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                headerCard

                if sizeClass == .regular {
                    // iPad: checklist sections side-by-side
                    HStack(alignment: .top, spacing: Spacing.lg) {
                        // Left column: Equipment
                        VStack(spacing: Spacing.lg) {
                            if !viewModel.equipmentItems.isEmpty {
                                checklistSection(
                                    title: "EQUIPO",
                                    icon: "wrench.and.screwdriver",
                                    items: viewModel.equipmentItems
                                )
                            }
                        }
                        .frame(maxWidth: .infinity)

                        // Right column: Supplies
                        VStack(spacing: Spacing.lg) {
                            if !viewModel.stockItems.isEmpty {
                                checklistSection(
                                    title: tr("events.checklist.storage_header", "INSUMOS DE ALMACEN"),
                                    icon: "archivebox",
                                    items: viewModel.stockItems
                                )
                            }

                            if !viewModel.purchaseItems.isEmpty {
                                checklistSection(
                                    title: tr("events.purchase.items_header", "INSUMOS A COMPRAR"),
                                    icon: "cart",
                                    items: viewModel.purchaseItems
                                )
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                } else {
                    // iPhone: stacked sections
                    if !viewModel.equipmentItems.isEmpty {
                        checklistSection(
                            title: "EQUIPO",
                            icon: "wrench.and.screwdriver",
                            items: viewModel.equipmentItems
                        )
                    }

                    if !viewModel.stockItems.isEmpty {
                        checklistSection(
                            title: tr("events.checklist.storage_header", "INSUMOS DE ALMACEN"),
                            icon: "archivebox",
                            items: viewModel.stockItems
                        )
                    }

                    if !viewModel.purchaseItems.isEmpty {
                        checklistSection(
                            title: tr("events.purchase.items_header", "INSUMOS A COMPRAR"),
                            icon: "cart",
                            items: viewModel.purchaseItems
                        )
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
    }

    // MARK: - Header Card

    private var headerCard: some View {
        VStack(spacing: Spacing.md) {
            // Icon circle
            Image(systemName: "list.clipboard")
                .font(.title)
                .foregroundStyle(SolennixColors.primary)
                .frame(width: 56, height: 56)
                .background(SolennixColors.primaryLight)
                .clipShape(Circle())

            Text(tr("events.checklist.title", "Checklist de Carga"))
                .font(.title3)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)

            let checkedCount = viewModel.checkedIds.intersection(Set(viewModel.items.map(\.id))).count
            let totalCount = viewModel.items.count

            Text(FeatureL10n.format("common.count_of_count", "%1$lld de %2$lld", checkedCount, totalCount))
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)

            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(SolennixColors.surfaceAlt)
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(SolennixColors.primary)
                        .frame(width: geo.size.width * viewModel.progress, height: 8)
                        .animation(reduceMotion ? nil : .easeInOut(duration: 0.3), value: viewModel.progress)
                }
            }
            .frame(height: 8)
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity)
        .solennixCard(border: false)
    }

    // MARK: - Checklist Section

    private func checklistSection(title: String, icon: String, items: [ChecklistItem]) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Section header
            HStack(spacing: Spacing.sm) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.primary)

                Text(title)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .tracking(1)
            }
            .padding(.horizontal, Spacing.xs)

            ForEach(items) { item in
                checklistRow(item)
            }
        }
    }

    // MARK: - Checklist Row

    private func checklistRow(_ item: ChecklistItem) -> some View {
        ChecklistItemRow(
            item: item,
            isChecked: viewModel.checkedIds.contains(item.id),
            onToggle: {
                withAnimation(reduceMotion ? nil : .snappy) {
                    viewModel.toggleItem(id: item.id)
                }
            }
        )
    }
}

// MARK: - Checklist Item Row

/// Private row view with stable identity per item.
///
/// Extracting into a struct ensures SwiftUI diffs by value rather than
/// re-evaluating the function on every list reload, so `.symbolEffect(.bounce)`
/// triggers only when `isChecked` transitions false→true (user toggle), not
/// on initial appear or unrelated reloads.
private struct ChecklistItemRow: View {
    let item: ChecklistItem
    let isChecked: Bool
    let onToggle: () -> Void

    private func formatQuantity(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", value)
            : String(format: "%.2f", value)
    }

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: Spacing.md) {
                // Checkbox — Image rendered unconditionally so SwiftUI can
                // observe the false→true transition and fire the bounce.
                ZStack {
                    Circle()
                        .fill(isChecked ? SolennixColors.primary : Color.clear)
                        .frame(width: 24, height: 24)

                    Circle()
                        .strokeBorder(
                            isChecked ? SolennixColors.primary : SolennixColors.border,
                            lineWidth: 2
                        )
                        .frame(width: 24, height: 24)

                    Image(systemName: "checkmark")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.onPrimary)
                        .opacity(isChecked ? 1 : 0)
                        // Outside any `if isChecked` — SwiftUI sees the value
                        // transition false→true and fires the bounce exactly once.
                        .symbolEffect(.bounce, value: isChecked)
                }

                // Name
                Text(item.name)
                    .font(.body)
                    .foregroundStyle(isChecked ? SolennixColors.textTertiary : SolennixColors.text)
                    .strikethrough(isChecked, color: SolennixColors.textTertiary)

                Spacer()

                // Quantity + unit
                let quantityText = formatQuantity(item.quantity) + (item.unit.map { " \($0)" } ?? "")
                Text(quantityText)
                    .font(.subheadline)
                    .foregroundStyle(isChecked ? SolennixColors.textTertiary : SolennixColors.textSecondary)
            }
            .padding(Spacing.md)
            .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Preview

#Preview("Event Checklist") {
    NavigationStack {
        EventChecklistView(eventId: "123", apiClient: APIClient())
    }
}
