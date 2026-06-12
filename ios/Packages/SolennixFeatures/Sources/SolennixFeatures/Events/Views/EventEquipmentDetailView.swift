import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Equipment Detail View

public struct EventEquipmentDetailView: View {

    let eventId: String

    @State private var viewModel: EventDetailViewModel
    @Environment(\.horizontalSizeClass) private var sizeClass

    public init(eventId: String, apiClient: APIClient) {
        self.eventId = eventId
        self._viewModel = State(initialValue: EventDetailViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.equipment.isEmpty {
                ProgressView(tr("events.detail.equipment.loading", "Cargando..."))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                content
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(tr("events.detail.equipment.title", "Equipo Asignado"))
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.loadEquipmentOnly(eventId: eventId) }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                if viewModel.equipment.isEmpty {
                    EmptyStateView(
                        icon: "wrench.and.screwdriver",
                        title: tr("events.detail.equipment.empty.title", "Sin Equipo"),
                        message: tr("events.detail.equipment.empty.message", "Este evento no tiene equipo asignado")
                    )
                } else {
                    HStack {
                        Text("\(viewModel.equipment.count) equipos asignados")
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                        Spacer()
                    }
                    .padding(Spacing.md)
                    .background(SolennixColors.successBg)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))

                    ForEach(viewModel.equipment) { item in
                        HStack {
                            VStack(alignment: .leading, spacing: Spacing.xxs) {
                                Text(item.equipmentName ?? tr("events.detail.equipment.fallback", "Equipo"))
                                    .font(.body)
                                    .fontWeight(.medium)
                                    .foregroundStyle(SolennixColors.text)

                                if let notes = item.notes, !notes.isEmpty {
                                    Text(notes)
                                        .font(.caption)
                                        .foregroundStyle(SolennixColors.textSecondary)
                                }
                            }

                            Spacer()

                            Text("x\(item.quantity)")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundStyle(SolennixColors.success)
                                .padding(.horizontal, Spacing.md)
                                .padding(.vertical, Spacing.xs)
                                .background(SolennixColors.successBg)
                                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                        }
                        .padding(Spacing.md)
                        .background(SolennixColors.card)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                        .shadowSm()
                    }
                }
            }
            .padding(.horizontal, sizeClass == .regular ? Spacing.xl : Spacing.md)
            .padding(.vertical, sizeClass == .regular ? Spacing.xl : Spacing.lg)
        }
    }

    // MARK: - Localization

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }
}
