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
                ProgressView(tr("common.loading", "Cargando..."))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                content
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(tr("events.detail.equipment.title", "Equipo Asignado"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink(value: Route.eventForm(id: eventId, step: 4)) {
                    Image(systemName: "pencil")
                        .foregroundStyle(SolennixColors.primary)
                        .accessibilityLabel(tr("events.equipment.edit", "Editar equipo"))
                }
            }
        }
        .task { await viewModel.loadEquipmentOnly(eventId: eventId) }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                if viewModel.equipment.isEmpty {
                    ContentUnavailableView {
                        Label(tr("events.equipment.empty_title", "Sin Equipo"), systemImage: "wrench.and.screwdriver")
                    } description: {
                        Text(tr("events.equipment.empty_message", "Este evento no tiene equipo asignado."))
                    } actions: {
                        NavigationLink(value: Route.eventForm(id: eventId, step: 4)) {
                            Text(tr("events.equipment.add", "Agregar equipo"))
                                .font(.headline)
                                .foregroundStyle(SolennixColors.primaryDark)
                                .padding(.horizontal, Spacing.xl)
                                .padding(.vertical, 16)
                                .background(SolennixColors.primaryLight)
                                .clipShape(Capsule())
                                .adaptiveGlass(in: Capsule(), fallback: .material)
                        }
                    }
                } else {
                    HStack {
                        Text(FeatureL10n.plural("events.detail.equipment.assigned_count", "%d equipos asignados", count: viewModel.equipment.count))
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

                            Text(FeatureL10n.format("events.equipment.qty_prefix", "x%lld", item.quantity))
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundStyle(SolennixColors.success)
                                .padding(.horizontal, Spacing.md)
                                .padding(.vertical, Spacing.xs)
                                .background(SolennixColors.successBg)
                                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                        }
                        .padding(Spacing.md)
                        .solennixCard(radius: CornerRadius.md, border: false)
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
