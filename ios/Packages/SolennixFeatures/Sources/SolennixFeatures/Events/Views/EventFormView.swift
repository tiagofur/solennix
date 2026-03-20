import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Form View

public struct EventFormView: View {

    let eventId: String?

    @State private var viewModel: EventFormViewModel
    @Environment(\.dismiss) private var dismiss

    public init(eventId: String? = nil, apiClient: APIClient) {
        self.eventId = eventId
        _viewModel = State(initialValue: EventFormViewModel(apiClient: apiClient))
    }

    private let stepTitles = ["General", "Productos", "Extras", "Insumos", "Finanzas"]

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
            .animation(.easeInOut(duration: 0.3), value: viewModel.currentStep)

            Divider()
                .foregroundStyle(SolennixColors.border)

            // Navigation buttons
            navigationButtons
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(eventId != nil ? "Editar Evento" : "Nuevo Evento")
        .navigationBarTitleDisplayMode(.inline)
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

    private var stepIndicator: some View {
        HStack(spacing: Spacing.sm) {
            ForEach(1...5, id: \.self) { step in
                VStack(spacing: Spacing.xs) {
                    ZStack {
                        Circle()
                            .fill(step == viewModel.currentStep ? SolennixColors.primary : (step < viewModel.currentStep ? SolennixColors.primary.opacity(0.3) : SolennixColors.surfaceAlt))
                            .frame(width: 28, height: 28)

                        Text("\(step)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(step == viewModel.currentStep ? .white : (step < viewModel.currentStep ? SolennixColors.primary : SolennixColors.textTertiary))
                    }

                    Text(stepTitles[step - 1])
                        .font(.caption2)
                        .foregroundStyle(step == viewModel.currentStep ? SolennixColors.primary : SolennixColors.textTertiary)
                }
                .frame(maxWidth: .infinity)

                if step < 5 {
                    Rectangle()
                        .fill(step < viewModel.currentStep ? SolennixColors.primary.opacity(0.3) : SolennixColors.border)
                        .frame(height: 1)
                        .frame(maxWidth: 20)
                        .offset(y: -8)
                }
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
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
