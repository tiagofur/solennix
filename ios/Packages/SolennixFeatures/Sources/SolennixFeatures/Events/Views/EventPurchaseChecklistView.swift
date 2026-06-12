import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Purchase Checklist View

public struct EventPurchaseChecklistView: View {

    let eventId: String

    @State private var viewModel: EventChecklistViewModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(eventId: String, apiClient: APIClient) {
        self.eventId = eventId
        self._viewModel = State(initialValue: EventChecklistViewModel(apiClient: apiClient))
    }

    private var purchaseItems: [ChecklistItem] {
        viewModel.purchaseItems
    }

    private var checkedPurchaseCount: Int {
        let ids = Set(purchaseItems.map(\.id))
        return viewModel.checkedIds.intersection(ids).count
    }

    private var purchaseProgress: Double {
        guard !purchaseItems.isEmpty else { return 0 }
        return Double(checkedPurchaseCount) / Double(purchaseItems.count)
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.items.isEmpty {
                ProgressView("Cargando checklist de compras...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if purchaseItems.isEmpty {
                EmptyStateView(
                    icon: "cart",
                    title: "Sin compras pendientes",
                    message: "Este evento no tiene insumos marcados para comprar"
                )
            } else {
                ScrollView {
                    VStack(spacing: Spacing.lg) {
                        headerCard

                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            HStack(spacing: Spacing.sm) {
                                Image(systemName: "cart.fill")
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.warning)
                                Text("INSUMOS A COMPRAR")
                                    .font(.caption)
                                    .fontWeight(.bold)
                                    .foregroundStyle(SolennixColors.textSecondary)
                                    .tracking(1)
                            }
                            .padding(.horizontal, Spacing.xs)

                            ForEach(purchaseItems) { item in
                                checklistRow(item)
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.lg)
                }
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Checklist de Compras")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.loadChecklist(eventId: eventId) }
    }

    private var headerCard: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "cart.badge.plus")
                .font(.title)
                .foregroundStyle(SolennixColors.warning)
                .frame(width: 56, height: 56)
                .background(SolennixColors.warning.opacity(0.15))
                .clipShape(Circle())

            Text("Checklist de Compras")
                .font(.title3)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)

            Text("\(checkedPurchaseCount) de \(purchaseItems.count)")
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(SolennixColors.surfaceAlt)
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(SolennixColors.warning)
                        .frame(width: geo.size.width * purchaseProgress, height: 8)
                        .animation(reduceMotion ? nil : .easeInOut(duration: 0.3), value: purchaseProgress)
                }
            }
            .frame(height: 8)
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }

    private func checklistRow(_ item: ChecklistItem) -> some View {
        PurchaseChecklistItemRow(
            item: item,
            isChecked: viewModel.checkedIds.contains(item.id),
            onToggle: {
                withAnimation(.easeInOut(duration: 0.2)) {
                    viewModel.toggleItem(id: item.id)
                }
            }
        )
    }
}

// MARK: - Purchase Checklist Item Row

/// Private row view with stable identity per purchase item.
///
/// See `ChecklistItemRow` in EventChecklistView for the rationale:
/// extracting into a struct prevents bounce on list reload by giving
/// SwiftUI stable identity to diff against.
private struct PurchaseChecklistItemRow: View {
    let item: ChecklistItem
    let isChecked: Bool
    let onToggle: () -> Void

    private func formatQuantity(_ value: Double) -> String {
        if value == floor(value) {
            return String(Int(value))
        }
        return String(format: "%.2f", value)
    }

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: Spacing.md) {
                ZStack {
                    Circle()
                        .fill(isChecked ? SolennixColors.warning : Color.clear)
                        .frame(width: 24, height: 24)

                    Circle()
                        .strokeBorder(
                            isChecked ? SolennixColors.warning : SolennixColors.border,
                            lineWidth: 2
                        )
                        .frame(width: 24, height: 24)

                    // Rendered unconditionally — bounce triggers on false→true
                    // transition only, not on initial appear or list reloads.
                    Image(systemName: "checkmark")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                        .opacity(isChecked ? 1 : 0)
                        .symbolEffect(.bounce, value: isChecked)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.text)
                        .strikethrough(isChecked)

                    if let unit = item.unit, !unit.isEmpty {
                        Text("\(formatQuantity(item.quantity)) \(unit)")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                    } else {
                        Text(formatQuantity(item.quantity))
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }

                Spacer()
            }
            .padding(Spacing.md)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(
                        isChecked ? SolennixColors.warning.opacity(0.35) : SolennixColors.border.opacity(0.5),
                        lineWidth: 1
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    EventPurchaseChecklistView(eventId: "123", apiClient: APIClient())
}
