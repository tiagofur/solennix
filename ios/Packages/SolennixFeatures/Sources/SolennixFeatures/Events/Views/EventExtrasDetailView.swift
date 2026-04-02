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
            if viewModel.isLoading && viewModel.event == nil {
                ProgressView("Cargando...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                content
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Extras")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.loadData(eventId: eventId) }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                if viewModel.extras.isEmpty {
                    EmptyStateView(
                        icon: "sparkles",
                        title: "Sin Extras",
                        message: "Este evento no tiene extras asignados"
                    )
                } else {
                    let subtotal = viewModel.extras.reduce(0.0) { $0 + $1.price }
                    HStack {
                        Text("\(viewModel.extras.count) extras")
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                        Spacer()
                        Text("Subtotal: \(subtotal.asMXN)")
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
