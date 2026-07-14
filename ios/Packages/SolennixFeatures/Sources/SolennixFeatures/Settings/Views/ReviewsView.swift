import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

public struct ReviewsView: View {

    @State private var viewModel: ReviewsViewModel
    @State private var scoped: ViewScopedTask?
    @State private var responseDrafts: [String: String] = [:]
    @State private var saveSuccessCounter: Int = 0     // B9: post-save haptic counter
    @State private var visibilitySuccessCounter: Int = 0 // B9: post-visibility haptic counter
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(ToastManager.self) private var toastManager

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: ReviewsViewModel(apiClient: apiClient))
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    public var body: some View {
        Group {
            if shouldShowEmptyState {
                emptyStateContent
            } else {
                reviewList
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(tr("reviews.organizer.title", "Reseñas"))
        .navigationBarTitleDisplayMode(.large)
        .solennixSearchable(text: $viewModel.searchText, prompt: tr("reviews.organizer.search_prompt", "Buscar reseñas..."))
        .searchMinimizedIfAvailable()
        .keyboardDoneToolbar()
        .task {
            await viewModel.fetchReviews()
            hydrateDrafts()
        }
        .viewScopedTask(scoped: $scoped)
        .refreshable {
            await viewModel.fetchReviews()
            hydrateDrafts()
        }
        .alert(tr("reviews.organizer.error.title", "Error"), isPresented: Binding(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button(tr("reviews.ok", "OK")) { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .sensoryFeedback(.success, trigger: saveSuccessCounter) { old, new in new > old }
        .sensoryFeedback(.success, trigger: visibilitySuccessCounter) { old, new in new > old }
    }

    // MARK: - State Helpers

    private var shouldShowEmptyState: Bool {
        viewModel.reviews.isEmpty && !viewModel.isLoading
    }

    // MARK: - Empty State Content (outside List for proper centering)

    @ViewBuilder
    private var emptyStateContent: some View {
        if let error = viewModel.errorMessage {
            ContentUnavailableView {
                Label(tr("reviews.organizer.empty_title", "Sin reseñas todavía"), systemImage: "network")
            } description: {
                Text(error)
            } actions: {
                Button(tr("event_form_links.shared.retry", "Reintentar")) {
                    scoped?.start { await viewModel.fetchReviews() }
                }
            }
        } else if viewModel.filteredReviews.isEmpty && !viewModel.searchText.isEmpty {
            ContentUnavailableView.search(text: viewModel.searchText)
        } else {
            ContentUnavailableView {
                Label(tr("reviews.organizer.empty_title", "Sin reseñas todavía"), systemImage: "star.bubble")
            } description: {
                Text(tr("reviews.organizer.empty_hint", "Cuando tus clientes califiquen sus eventos, aparecerán aquí."))
            }
        }
    }

    // MARK: - Review List (inside List)

    private var reviewList: some View {
        List {
            Section {
                ForEach(viewModel.filteredReviews) { review in
                    reviewCardRow(review)
                        .solennixRow()
                        .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                }
            }
        }
        .listStyle(.insetGrouped)
        .solennixListStyle()
    }

    // MARK: - Skeleton Rows (B3)

    @ViewBuilder
    private var skeletonRows: some View {
        ForEach(0..<4, id: \.self) { _ in
            // Mirrors the card shape: client bar + stars stub + comment bars
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        SkeletonLine(width: 140, height: 14)   // client name — headline
                        SkeletonLine(width: 100, height: 10)   // event label — caption
                    }
                    Spacer()
                    SkeletonLine(width: 60, height: 14)        // stars stub — subheadline
                }
                SkeletonLine(width: 220, height: 10)           // comment line 1
                SkeletonLine(width: 180, height: 10)           // comment line 2
            }
            .padding(.vertical, Spacing.xs)
            .solennixRow()
            .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
        }
        .accessibilityHidden(true)
    }

    // MARK: - Review Card Row (B2: internal layout preserved, card chrome from List)

    private func reviewCardRow(_ review: EventReview) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // B10: stack header at .accessibility1+
            if dynamicTypeSize >= .accessibility1 {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    clientEventStack(review)
                    starsView(review)
                }
            } else {
                HStack(alignment: .top) {
                    clientEventStack(review)
                    Spacer()
                    starsView(review)
                }
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
                    scoped?.start {
                        await viewModel.updateVisibility(reviewId: review.id, visibility: .private)
                        guard viewModel.errorMessage == nil else { return }
                        visibilitySuccessCounter += 1   // B9: visibility haptic
                    }
                }

                visibilityButton(
                    title: tr("reviews.organizer.visibility.public", "Pública"),
                    selected: review.visibility == .public,
                    disabled: viewModel.updatingVisibilityId == review.id
                ) {
                    scoped?.start {
                        await viewModel.updateVisibility(reviewId: review.id, visibility: .public)
                        guard viewModel.errorMessage == nil else { return }
                        visibilitySuccessCounter += 1   // B9: visibility haptic
                    }
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
            .textFieldStyle(.plain)
            .padding(Spacing.sm)
            .background(SolennixColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(SolennixColors.border, lineWidth: 1)
            )

            Button {
                let draft = responseDrafts[review.id] ?? ""
                scoped?.start {
                    await viewModel.saveResponse(reviewId: review.id, text: draft)
                    guard viewModel.errorMessage == nil else { return }
                    toastManager.show(
                        message: tr("reviews.organizer.response.saved_toast", "Respuesta guardada"),
                        type: .success
                    )
                    saveSuccessCounter += 1   // B9: save success haptic
                }
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
            .disabled(viewModel.savingResponseId == review.id)
        }
        .padding(.vertical, Spacing.xs)
    }

    // MARK: - Client/Event Stack

    private func clientEventStack(_ review: EventReview) -> some View {
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
    }

    // MARK: - Stars View (B8)

    private func starsView(_ review: EventReview) -> some View {
        Text(stars(review.rating))
            .font(.subheadline)
            // B8: primary (gold) not warning (orange) for rating/brand semantic
            .foregroundStyle(SolennixColors.primary)
            // B8: accessible label "N de 5 estrellas"
            .accessibilityLabel(starsAccessibilityLabel(review.rating))
    }

    // MARK: - Visibility Button (B7)

    private func visibilityButton(
        title: String,
        selected: Bool,
        disabled: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .fontWeight(.semibold)
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.xs)
                .frame(maxWidth: .infinity)
                // Text on the gold (primary) selected chip must use onPrimary
                // (navy, WCAG AA) — textInverse resolves to white and fails contrast.
                .foregroundStyle(selected ? SolennixColors.onPrimary : SolennixColors.textSecondary)
                .background(selected ? SolennixColors.primary : SolennixColors.surfaceGrouped)
                .clipShape(Capsule())
        }
        .disabled(disabled)
        // B7: ≥44pt tap target
        .frame(minHeight: 44)
        .contentShape(Rectangle())
        // B7: selected trait for VoiceOver
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    // MARK: - Helpers

    private func stars(_ value: Int) -> String {
        let clamped = max(1, min(5, value))
        return String(repeating: "★", count: clamped) + String(repeating: "☆", count: max(0, 5 - clamped))
    }

    private func starsAccessibilityLabel(_ value: Int) -> String {
        let clamped = max(1, min(5, value))
        // B8: "N de 5 estrellas" — invariant singular works for all N≥1
        return FeatureL10n.plural(
            "reviews.organizer.stars_label",
            "%lld de 5 estrellas",
            count: clamped
        )
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
