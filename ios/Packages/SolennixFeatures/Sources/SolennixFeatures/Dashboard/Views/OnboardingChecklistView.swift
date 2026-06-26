import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Onboarding Step Model

struct OnboardingStep: Identifiable {
    let id: String
    let title: String
    let description: String
    let icon: String
    let isCompleted: Bool
    let destination: Route?
}

// MARK: - Onboarding Checklist View

struct OnboardingChecklistView: View {

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    let hasClients: Bool
    let hasProducts: Bool
    let hasEvents: Bool
    let onDismiss: () -> Void

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    private var steps: [OnboardingStep] {
        [
            OnboardingStep(
                id: "create_client",
                title: tr("dashboard.checklist.create_client.title", "Crea tu primer cliente"),
                description: tr("dashboard.checklist.create_client.description", "Registra los datos de tu primer cliente"),
                icon: "person.badge.plus",
                isCompleted: hasClients,
                destination: Route.clientForm()
            ),
            OnboardingStep(
                id: "create_product",
                title: tr("dashboard.checklist.create_product.title", "Agrega un producto o servicio"),
                description: tr("dashboard.checklist.create_product.description", "Define lo que ofreces a tus clientes"),
                icon: "tag",
                isCompleted: hasProducts,
                destination: Route.productForm()
            ),
            OnboardingStep(
                id: "create_event",
                title: tr("dashboard.checklist.create_event.title", "Crea tu primer evento"),
                description: tr("dashboard.checklist.create_event.description", "Cotiza y organiza tu primer evento"),
                icon: "calendar.badge.plus",
                isCompleted: hasEvents,
                destination: Route.eventForm()
            ),
        ]
    }

    private var completedCount: Int {
        steps.filter(\.isCompleted).count
    }

    private var progress: Double {
        steps.isEmpty ? 0 : Double(completedCount) / Double(steps.count)
    }

    private var allCompleted: Bool {
        completedCount == steps.count
    }

    var body: some View {
        if !allCompleted {
            VStack(alignment: .leading, spacing: Spacing.md) {
                // Auto-dismiss: when the last step is checked, mark onboarding
                // as complete so the checklist doesn't flash on the next launch.
                // The parent DashboardView already guards `!hasCompletedOnboarding`
                // before instantiating this view, so returning users never reach here.
                EmptyView()
                    .onChange(of: allCompleted) { _, completed in
                        if completed {
                            hasCompletedOnboarding = true
                            onDismiss()
                        }
                    }
                // Header
                HStack {
                    Image(systemName: "paperplane.fill")
                        .font(.title3)
                        .foregroundStyle(SolennixColors.primary)

                    Text(tr("dashboard.checklist.title", "Primeros pasos"))
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.text)

                    Spacer()

                    Button {
                        onDismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(SolennixColors.textTertiary)
                            .padding(Spacing.sm)
                    }
                    .accessibilityLabel(tr("dashboard.checklist.dismiss", "Cerrar primeros pasos"))
                }

                // Progress bar
                HStack(spacing: Spacing.sm) {
                    ProgressView(value: progress)
                        .animation(reduceMotion ? nil : .easeInOut, value: progress)

                    Text("\(completedCount)/\(steps.count)")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }

                // Steps
                VStack(spacing: Spacing.sm) {
                    ForEach(steps) { step in
                        OnboardingStepRow(step: step)
                    }
                }
            }
            .padding(Spacing.md)
            .solennixCard(border: false)
            .padding(.horizontal, Spacing.md)
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }
}

// MARK: - Onboarding Step Row

private struct OnboardingStepRow: View {

    let step: OnboardingStep

    var body: some View {
        Group {
            if step.isCompleted {
                completedRow
            } else if let destination = step.destination {
                NavigationLink(value: destination) {
                    rowContent
                }
                .buttonStyle(.plain)
            } else {
                rowContent
            }
        }
    }

    private var completedRow: some View {
        HStack(spacing: Spacing.sm) {
            // Completed checkmark
            ZStack {
                Circle()
                    .fill(SolennixColors.success)
                    .frame(width: 32, height: 32)

                Image(systemName: "checkmark")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(SolennixColors.textInverse)
                    .symbolEffect(.bounce, value: step.isCompleted)
            }

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(step.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.success)

                Text(step.description)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            Spacer()
        }
        .padding(Spacing.sm)
        .background(SolennixColors.success.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    private var rowContent: some View {
        HStack(spacing: Spacing.sm) {
            // Step icon
            ZStack {
                Circle()
                    .fill(SolennixColors.primaryLight)
                    .frame(width: 32, height: 32)

                Image(systemName: step.icon)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.primary)
            }

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(step.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)

                Text(step.description)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(SolennixColors.textTertiary)
        }
        .padding(Spacing.sm)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }
}
