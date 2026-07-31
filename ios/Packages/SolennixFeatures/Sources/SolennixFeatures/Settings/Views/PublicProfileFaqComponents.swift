import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - FAQ Section (Pro+)

/// Lists existing Q/A items, exposes an add form while below the cap
/// (`PublicProfileSettingsViewModel.faqMax` = 12), and shows the max message
/// when full. Add/delete run through the view-scoped `start` wrapper.
struct PublicProfileFaqSection: View {
    @Bindable var viewModel: PublicProfileSettingsViewModel
    let start: PublicProfileScopedStart

    private var atMax: Bool {
        viewModel.faq.count >= PublicProfileSettingsViewModel.faqMax
    }

    var body: some View {
        Section {
            if !viewModel.isPaid {
                Text(FeatureL10n.text(
                    "settings.public_profile.faq_pro_hint",
                    "Las preguntas frecuentes están disponibles en el plan Pro."
                ))
                .font(.caption)
                .foregroundStyle(SolennixColors.textTertiary)
                .solennixRow()
            } else if viewModel.faqLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .solennixRow()
            } else if viewModel.faq.isEmpty {
                Text(FeatureL10n.text(
                    "settings.public_profile.faq_empty",
                    "Todavía no hay preguntas frecuentes."
                ))
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .solennixRow()
            } else {
                ForEach(viewModel.faq) { item in
                    PublicProfileFaqRow(
                        item: item,
                        onDelete: {
                            start {
                                await viewModel.deleteFaqItem(id: item.id)
                            }
                        }
                    )
                    .solennixRow()
                }
            }

            if viewModel.isPaid, !atMax {
                addForm
            }

            if viewModel.isPaid, atMax {
                Text(FeatureL10n.text("settings.public_profile.faq_max", "Ya tenés 12 preguntas."))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .solennixRow()
            }

            if let faqError = viewModel.faqError {
                Text(faqError)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.error)
                    .solennixRow()
            }
        } header: {
            HStack(spacing: Spacing.xs) {
                Text(FeatureL10n.text("settings.public_profile.faq_section", "Preguntas frecuentes"))
                if !viewModel.isPaid {
                    Image(systemName: "lock.fill")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }
        } footer: {
            if viewModel.isPaid {
                Text(FeatureL10n.text(
                    "settings.public_profile.faq_description",
                    "Hasta 12 preguntas y respuestas para tu página pública."
                ))
            }
        }
    }

    @ViewBuilder
    private var addForm: some View {
        TextField(
            FeatureL10n.text("settings.public_profile.faq_question", "Pregunta"),
            text: $viewModel.newFaqQuestion
        )
        .solennixRow()

        TextField(
            FeatureL10n.text("settings.public_profile.faq_answer", "Respuesta"),
            text: $viewModel.newFaqAnswer,
            axis: .vertical
        )
        .lineLimit(2...4)
        .solennixRow()

        Button {
            start {
                await viewModel.addFaqItem()
            }
        } label: {
            HStack {
                Spacer()
                if viewModel.isAddingFaq {
                    ProgressView()
                } else {
                    Label(
                        FeatureL10n.text("settings.public_profile.faq_add", "Agregar pregunta"),
                        systemImage: "plus.circle.fill"
                    )
                    .font(.subheadline.weight(.semibold))
                }
                Spacer()
            }
        }
        .disabled(
            viewModel.isAddingFaq
                || viewModel.newFaqQuestion.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                || viewModel.newFaqAnswer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        )
        .solennixRow()
    }
}

// MARK: - FAQ Row

private struct PublicProfileFaqRow: View {
    let item: OrganizerPublicFaqItem
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.question)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(SolennixColors.text)
                Text(item.answer)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .lineLimit(3)
            }

            Spacer()

            Button(role: .destructive, action: onDelete) {
                Image(systemName: "trash")
                    .foregroundStyle(SolennixColors.error)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel(FeatureL10n.text("common.delete", "Eliminar"))
        }
        .padding(.vertical, Spacing.xs)
    }
}
