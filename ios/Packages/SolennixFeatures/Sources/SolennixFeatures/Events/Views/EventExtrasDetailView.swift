import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Extras Detail View

public struct EventExtrasDetailView: View {

    let eventId: String

    @State private var viewModel: EventDetailViewModel

    public init(eventId: String, apiClient: APIClient) {
        self.eventId = eventId
        self._viewModel = State(initialValue: EventDetailViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.extras.isEmpty {
                ProgressView(tr("events.detail.extras.loading", "Cargando..."))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                content
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(tr("events.detail.extras.title", "Extras"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink(value: Route.eventForm(id: eventId, step: 3)) {
                    Image(systemName: "pencil")
                        .foregroundStyle(SolennixColors.primary)
                        .accessibilityLabel(tr("events.detail.extras.edit_a11y", "Editar extras"))
                }
            }
        }
        .task { await viewModel.loadExtrasOnly(eventId: eventId) }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                if viewModel.extras.isEmpty {
                    EmptyStateView(
                        icon: "sparkles",
                        title: tr("events.detail.extras.empty.title", "Sin Extras"),
                        message: tr("events.detail.extras.empty.message", "Este evento no tiene extras asignados."),
                        iconColor: SolennixColors.primary
                    )
                    NavigationLink(value: Route.eventForm(id: eventId, step: 3)) {
                        Text(tr("events.detail.extras.empty.cta", "Agregar extras"))
                            .font(.headline)
                            .foregroundStyle(SolennixColors.primaryDark)
                            .padding(.horizontal, Spacing.xl)
                            .padding(.vertical, 16)
                            .background(SolennixColors.primaryLight)
                            .clipShape(Capsule())
                            .adaptiveGlass(in: Capsule(), fallback: .material)
                    }
                } else {
                    let subtotal = viewModel.extras.reduce(0.0) { $0 + $1.price }
                    HStack {
                        Text(FeatureL10n.plural("events.detail.extras.count", "%d extras", count: viewModel.extras.count))
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                        Spacer()
                        Text(String(format: tr("events.detail.extras.subtotal", "Subtotal: %@"), subtotal.asMXN))
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundStyle(SolennixColors.info)
                    }
                    .padding(Spacing.md)
                    .background(SolennixColors.infoBg)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))

                    ForEach(viewModel.extras) { extra in
                        HStack {
                            Text(extra.description)
                                .font(.body)
                                .fontWeight(.medium)
                                .foregroundStyle(SolennixColors.text)

                            Spacer()

                            Text(extra.price.asMXN)
                                .font(.body)
                                .fontWeight(.bold)
                                .foregroundStyle(SolennixColors.text)
                        }
                        .padding(Spacing.md)
                        .solennixCard(radius: CornerRadius.md, border: false)
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
    }

    // MARK: - Localization

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }
}
