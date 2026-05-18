import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

public struct ReviewsView: View {

    @State private var viewModel: ReviewsViewModel
    @State private var responseDrafts: [String: String] = [:]

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: ReviewsViewModel(apiClient: apiClient))
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.reviews.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.reviews.isEmpty {
                EmptyStateView(
                    icon: "star.bubble",
                    title: tr("reviews.organizer.empty_title", "Sin reseñas todavía"),
                    message: tr("reviews.organizer.empty_hint", "Cuando tus clientes califiquen sus eventos, aparecerán aquí.")
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: Spacing.md) {
                        ForEach(viewModel.reviews) { review in
                            reviewCard(review)
                        }
                    }
                    .padding(Spacing.md)
                }
                .background(SolennixColors.surfaceGrouped)
            }
        }
        .navigationTitle(tr("reviews.organizer.title", "Reseñas"))
        .navigationBarTitleDisplayMode(.large)
        .task {
            await viewModel.fetchReviews()
            hydrateDrafts()
        }
        .refreshable {
            await viewModel.fetchReviews()
            hydrateDrafts()
        }
        .alert(tr("common.error", "Error"), isPresented: .constant(viewModel.errorMessage != nil)) {
            Button("OK") { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }

    private func reviewCard(_ review: EventReview) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(review.clientName ?? tr("reviews.organizer.unknown_client", "Cliente"))
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    Text(review.eventLabel ?? tr("reviews.organizer.unknown_event", "Evento"))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Text(review.submittedAt.formattedDateFromISODate())
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }

                Spacer()

                Text(stars(review.rating))
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.warning)
            }

            if let comment = review.comment, !comment.isEmpty {
                Text(comment)
                    .font(.body)
                    .foregroundStyle(SolennixColors.text)
            }

            HStack(spacing: Spacing.xs) {
                visibilityButton(
                    title: tr("reviews.organizer.visibility.private", "Privada"),
                    selected: review.visibility == .private,
                    disabled: viewModel.updatingVisibilityId == review.id
                ) {
                    Task { await viewModel.updateVisibility(reviewId: review.id, visibility: .private) }
                }

                visibilityButton(
                    title: tr("reviews.organizer.visibility.public", "Pública"),
                    selected: review.visibility == .public,
                    disabled: viewModel.updatingVisibilityId == review.id
                ) {
                    Task { await viewModel.updateVisibility(reviewId: review.id, visibility: .public) }
                }
            }

            TextField(
                tr("reviews.organizer.response.placeholder", "Respuesta del organizador"),
                text: Binding(
                    get: { responseDrafts[review.id] ?? review.organizerResponse ?? "" },
                    set: { responseDrafts[review.id] = $0 }
                ),
                axis: .vertical
            )
            .lineLimit(2...5)
            .textFieldStyle(.roundedBorder)

            Button {
                let draft = responseDrafts[review.id] ?? ""
                Task { await viewModel.saveResponse(reviewId: review.id, text: draft) }
            } label: {
                if viewModel.savingResponseId == review.id {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else {
                    Text(tr("common.save", "Guardar"))
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(SolennixColors.primary)
            .disabled(viewModel.savingResponseId == review.id)
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }

    private func visibilityButton(title: String, selected: Bool, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .fontWeight(.semibold)
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.xs)
                .frame(maxWidth: .infinity)
                .foregroundStyle(selected ? Color.white : SolennixColors.textSecondary)
                .background(selected ? SolennixColors.primary : SolennixColors.surfaceGrouped)
                .clipShape(Capsule())
        }
        .disabled(disabled)
    }

    private func stars(_ value: Int) -> String {
        let clamped = max(1, min(5, value))
        return String(repeating: "★", count: clamped) + String(repeating: "☆", count: max(0, 5 - clamped))
    }

    private func hydrateDrafts() {
        for review in viewModel.reviews {
            if responseDrafts[review.id] == nil {
                responseDrafts[review.id] = review.organizerResponse ?? ""
            }
        }
    }
}

private extension String {
    func formattedDateFromISODate() -> String {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: self) {
            return date.formatted(date: .abbreviated, time: .omitted)
        }
        return self
    }
}
