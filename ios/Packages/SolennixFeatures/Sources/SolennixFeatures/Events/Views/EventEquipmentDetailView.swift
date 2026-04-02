import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Equipment Detail View

public struct EventEquipmentDetailView: View {

    let eventId: String

    @State private var viewModel: EventDetailViewModel

    public init(eventId: String, apiClient: APIClient) {
        self.eventId = eventId
        self._viewModel = State(initialValue: EventDetailViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.event == nil {
                ProgressView("Cargando...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                content
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Equipo Asignado")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.loadData(eventId: eventId) }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                if viewModel.equipment.isEmpty {
                    EmptyStateView(
                        icon: "wrench.and.screwdriver",
                        title: "Sin Equipo",
                        message: "Este evento no tiene equipo asignado"
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
                                Text(item.equipmentName ?? "Equipo")
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
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
    }
}
