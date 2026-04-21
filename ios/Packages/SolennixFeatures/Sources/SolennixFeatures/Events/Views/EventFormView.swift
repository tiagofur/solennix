import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Form View

public struct EventFormView: View {

    let eventId: String?

    @State private var viewModel: EventFormViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(eventId: String? = nil, apiClient: APIClient) {
        self.eventId = eventId
        _viewModel = State(initialValue: EventFormViewModel(apiClient: apiClient))
    }

    /// Init for duplicating an existing event. The viewModel should have `prefill(from:)` called
    /// before being passed here — prefill is applied after initial data loads.
    public init(prefilledViewModel: EventFormViewModel) {
        self.eventId = nil
        _viewModel = State(initialValue: prefilledViewModel)
    }

    private struct StepMeta {
        let icon: String
        let label: String
    }

    private let steps: [StepMeta] = [
        StepMeta(icon: "info.circle.fill", label: "General"),
        StepMeta(icon: "shippingbox.fill", label: "Productos"),
        StepMeta(icon: "sparkles", label: "Extras"),
        StepMeta(icon: "cart.fill", label: "Inventario"),
        StepMeta(icon: "dollarsign.circle.fill", label: "Finanzas"),
    ]

    public var body: some View {
        VStack(spacing: 0) {
            // Step indicator
            stepIndicator

            Divider()
                .foregroundStyle(SolennixColors.border)

            // Step content
            TabView(selection: $viewModel.currentStep) {
                Step1GeneralView(viewModel: viewModel)
                    .tag(1)

                Step2ProductsView(viewModel: viewModel)
                    .tag(2)

                Step3ExtrasView(viewModel: viewModel)
                    .tag(3)

                Step4SuppliesEquipmentView(viewModel: viewModel)
                    .tag(4)

                Step5FinancesView(viewModel: viewModel)
                    .tag(5)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(reduceMotion ? nil : .easeInOut(duration: 0.3), value: viewModel.currentStep)

            Divider()
                .foregroundStyle(SolennixColors.border)

            // Navigation buttons
            navigationButtons
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(eventId != nil ? "Editar Evento" : "Nuevo Evento")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Cancelar") {
                    dismiss()
                }
                .foregroundStyle(SolennixColors.text)
            }
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView("Cargando...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(SolennixColors.background.opacity(0.6))
            }
        }
        .alert("Error", isPresented: .init(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .task {
            await viewModel.loadInitialData()
            if let id = eventId {
                await viewModel.loadEventForEditing(id: id)
            }
        }
    }

    // MARK: - Step Indicator
    //
    // Compact HIG-style: linear ProgressView + icon row. Solo el paso activo
    // muestra la etiqueta debajo (una línea, sin duplicar vertical en iPhone
    // base). Circles pasados → check, activo → icono primario, futuros → icono
    // muted.

    private var stepIndicator: some View {
        let current = viewModel.currentStep
        return VStack(spacing: Spacing.xs) {
            ProgressView(value: Double(current), total: Double(steps.count))
                .progressViewStyle(.linear)
                .tint(SolennixColors.primary)

            HStack(spacing: 0) {
                ForEach(Array(steps.enumerated()), id: \.offset) { index, meta in
                    let stepNumber = index + 1
                    let isActive = stepNumber == current
                    let isCompleted = stepNumber < current
                    VStack(spacing: 4) {
                        ZStack {
                            Circle()
                                .fill(
                                    isCompleted
                                        ? SolennixColors.primary
                                        : (isActive ? SolennixColors.primary.opacity(0.15) : SolennixColors.surfaceAlt)
                                )
                                .frame(width: 28, height: 28)

                            Image(systemName: isCompleted ? "checkmark" : meta.icon)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(
                                    isCompleted
                                        ? .white
                                        : (isActive ? SolennixColors.primary : SolennixColors.textTertiary)
                                )
                        }

                        if isActive {
                            Text(meta.label)
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundStyle(SolennixColors.primary)
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        if stepNumber < current {
                            viewModel.currentStep = stepNumber
                        }
                    }
                }
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.top, Spacing.sm)
        .padding(.bottom, Spacing.xs)
        .background(SolennixColors.background)
    }

    // MARK: - Navigation Buttons

    private var navigationButtons: some View {
        HStack(spacing: Spacing.md) {
            if viewModel.currentStep > 1 {
                Button {
                    viewModel.previousStep()
                } label: {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "chevron.left")
                        Text("Anterior")
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, 12)
                    .background(SolennixColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(SolennixColors.border, lineWidth: 1)
                    )
                }
            }

            Spacer()

            if viewModel.currentStep < 5 {
                Button {
                    viewModel.nextStep()
                } label: {
                    HStack(spacing: Spacing.xs) {
                        Text("Siguiente")
                        Image(systemName: "chevron.right")
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, 12)
                    .background(SolennixGradient.premium)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }
                .disabled(viewModel.currentStep == 1 && !viewModel.isStep1Valid)
                .opacity(viewModel.currentStep == 1 && !viewModel.isStep1Valid ? 0.5 : 1.0)
            } else {
                PremiumButton(
                    title: "Guardar",
                    isLoading: viewModel.isSaving,
                    isDisabled: !viewModel.isStep1Valid,
                    fullWidth: false
                ) {
                    Task {
                        do {
                            let isNewEvent = !viewModel.isEdit
                            try await viewModel.save()

                            if isNewEvent {
                                StoreReviewHelper.recordEventCreated()
                            }

                            dismiss()
                        } catch {
                            viewModel.errorMessage = error.localizedDescription
                        }
                    }
                }
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(SolennixColors.background)
    }
}

// MARK: - Preview

#Preview("New Event") {
    NavigationStack {
        EventFormView(apiClient: APIClient())
    }
}

#Preview("Edit Event") {
    NavigationStack {
        EventFormView(eventId: "123", apiClient: APIClient())
    }
}
