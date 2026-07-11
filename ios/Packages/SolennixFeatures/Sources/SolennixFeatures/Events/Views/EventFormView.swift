import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Form View

public struct EventFormView: View {

    let eventId: String?
    let initialStep: Int?

    @State private var viewModel: EventFormViewModel
    @State private var didApplyInitialStep = false
    @State private var showDiscardDialog = false
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(PlanLimitsManager.self) private var planLimitsManager
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    public init(eventId: String? = nil, initialStep: Int? = nil, apiClient: APIClient) {
        self.eventId = eventId
        self.initialStep = initialStep
        _viewModel = State(initialValue: EventFormViewModel(apiClient: apiClient))
    }

    /// Init for duplicating an existing event. The viewModel should have `prefill(from:)` called
    /// before being passed here — prefill is applied after initial data loads.
    public init(prefilledViewModel: EventFormViewModel) {
        self.eventId = nil
        self.initialStep = nil
        _viewModel = State(initialValue: prefilledViewModel)
    }

    fileprivate struct StepMeta {
        let icon: String
        let label: String
    }

    private var steps: [StepMeta] {[
        StepMeta(icon: "info.circle.fill", label: tr("events.form.step.general", "General")),
        StepMeta(icon: "shippingbox.fill", label: tr("events.form.step.products", "Productos")),
        StepMeta(icon: "sparkles", label: tr("events.form.step.extras", "Extras")),
        StepMeta(icon: "cart.fill", label: tr("events.form.step.inventory", "Inventario")),
        StepMeta(icon: "dollarsign.circle.fill", label: tr("events.form.step.finances", "Finanzas")),
    ]}

    // Extracted bindings to keep body type-checker load below threshold.
    private var errorBinding: Binding<Bool> {
        Binding(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )
    }

    private var paywallBinding: Binding<Bool> {
        Binding(
            get: { viewModel.planLimitMessage != nil },
            set: { if !$0 { viewModel.planLimitMessage = nil } }
        )
    }

    public var body: some View {
        formWithNavigation
            .withFormLifecycle(
                eventId: eventId,
                initialStep: initialStep,
                didApplyInitialStep: $didApplyInitialStep,
                viewModel: viewModel
            )
    }

    // Navigation-layer modifiers (title, toolbar, alert, sheet) — extracted to
    // keep body type-checker budget below threshold.
    private var formWithNavigation: some View {
        formContent
            .background(horizontalSizeClass == .regular ? Color(uiColor: .systemGroupedBackground) : SolennixColors.surfaceGrouped)
            .navigationTitle(eventId != nil ? tr("events.form.title_edit", "Editar evento") : tr("events.form.title_new", "Nuevo evento"))
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    SolennixCancelButton(title: tr("events.form.cancel", "Cancelar")) {
                        if viewModel.isDirty {
                            showDiscardDialog = true
                        } else {
                            dismiss()
                        }
                    }
                }
            }
            .overlay {
                if viewModel.isLoading {
                    ProgressView(tr("events.form.loading", "Cargando..."))
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(SolennixColors.background.opacity(0.6))
                }
            }
            .alert(tr("events.form.error_title", "Error"), isPresented: errorBinding) {
                Button(tr("events.form.ok", "OK"), role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
            .sheet(isPresented: paywallBinding) {
                PaywallSheet(
                    message: viewModel.planLimitMessage ?? "",
                    onUpgrade: {
                        viewModel.planLimitMessage = nil
                    },
                    onDismiss: {
                        viewModel.planLimitMessage = nil
                    }
                )
            }
            .keyboardDoneToolbar()
            .confirmationDialog(
                tr("common.discard_changes.title", "¿Descartar cambios?"),
                isPresented: $showDiscardDialog,
                titleVisibility: .visible
            ) {
                Button(tr("common.discard_changes.confirm", "Descartar"), role: .destructive) {
                    dismiss()
                }
                Button(tr("common.discard_changes.cancel", "Cancelar"), role: .cancel) {}
            }
    }

    private var formContent: some View {
        HStack {
            if horizontalSizeClass == .regular {
                Spacer()
            }

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
                .animation(reduceMotion ? nil : .smooth(duration: 0.35), value: viewModel.currentStep)

                Divider()
                    .foregroundStyle(SolennixColors.border)

                // Navigation buttons
                navigationButtons
            }
            .background(SolennixColors.surfaceGrouped)
            .frame(maxWidth: horizontalSizeClass == .regular ? 640 : .infinity)

            if horizontalSizeClass == .regular {
                Spacer()
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
        let isEditing = viewModel.isEdit
        return VStack(spacing: Spacing.xs) {
            ProgressView(value: Double(current), total: Double(steps.count))
                .progressViewStyle(.linear)
                .tint(SolennixColors.primary)

            HStack(spacing: 0) {
                ForEach(Array(steps.enumerated()), id: \.offset) { index, meta in
                    let stepNumber = index + 1
                    let isActive = stepNumber == current
                    let isCompleted = stepNumber < current
                    let isTappable = isEditing ? (stepNumber != current) : (stepNumber < current)
                    StepDot(
                        stepNumber: stepNumber,
                        meta: meta,
                        isActive: isActive,
                        isCompleted: isCompleted,
                        isTappable: isTappable,
                        onTap: { viewModel.currentStep = stepNumber }
                    )
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
                PremiumButton(
                    title: tr("events.form.previous", "Anterior"),
                    fullWidth: false,
                    style: .secondary,
                    icon: "chevron.left"
                ) {
                    viewModel.previousStep()
                }
            }

            Spacer()

            if viewModel.currentStep < 5 {
                PremiumButton(
                    title: tr("events.form.next", "Siguiente"),
                    isDisabled: viewModel.currentStep == 1 && !viewModel.isStep1Valid,
                    fullWidth: false,
                    icon: "chevron.right",
                    iconPosition: .trailing
                ) {
                    viewModel.nextStep()
                }
            } else {
                PremiumButton(
                    title: tr("events.form.save", "Guardar"),
                    isLoading: viewModel.isSaving,
                    isDisabled: !viewModel.isStep1Valid || viewModel.isSaving,
                    fullWidth: false,
                    icon: "checkmark"
                ) {
                    Task {
                        do {
                            let isNewEvent = !viewModel.isEdit
                            try await viewModel.save()

                            if isNewEvent {
                                StoreReviewHelper.recordEventCreated()
                            }

                            dismiss()
                        } catch let error as APIError {
                            if case .planLimitExceeded(let message, _, _, _) = error {
                                viewModel.planLimitMessage = message
                            } else {
                                viewModel.errorMessage = error.localizedDescription
                            }
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

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }
}

// MARK: - Form Lifecycle Modifier
//
// Extracted from EventFormView.body to keep type-checker load below threshold.
// Carries .task (load), .onChange (swipe guard + dirty tracking), and
// .interactiveDismissDisabled so they don't inflate the body expression tree.

private struct FormLifecycleModifier: ViewModifier {

    let eventId: String?
    let initialStep: Int?
    @Binding var didApplyInitialStep: Bool
    @Bindable var viewModel: EventFormViewModel
    @Environment(CacheManager.self) private var cacheManager: CacheManager?

    func body(content: Content) -> some View {
        content
            .task {
                viewModel.setCacheManager(cacheManager)
                await viewModel.loadInitialData()
                if let id = eventId {
                    await viewModel.loadEventForEditing(id: id)
                    if !didApplyInitialStep, let step = initialStep {
                        didApplyInitialStep = true
                        let clamped = max(1, min(5, step))
                        viewModel.currentStep = clamped
                    }
                }
            }
            // Swipe-forward guard: block advancing past step 1 until valid.
            .onChange(of: viewModel.currentStep) { oldStep, newStep in
                if !viewModel.isEdit && newStep > 1 && !viewModel.isStep1Valid {
                    viewModel.currentStep = oldStep
                }
            }
            // isDirty is now a pure computed comparison against a post-load
            // snapshot — no onChange watchers needed for dirty tracking.
            .interactiveDismissDisabled(viewModel.isDirty && !viewModel.isSaving)
    }
}

private extension View {
    func withFormLifecycle(
        eventId: String?,
        initialStep: Int?,
        didApplyInitialStep: Binding<Bool>,
        viewModel: EventFormViewModel
    ) -> some View {
        modifier(FormLifecycleModifier(
            eventId: eventId,
            initialStep: initialStep,
            didApplyInitialStep: didApplyInitialStep,
            viewModel: viewModel
        ))
    }
}

// MARK: - Step Dot
//
// Extracted into its own struct so @ScaledMetric and the VoiceOver modifier
// chain don't inflate the EventFormView body type-checker budget.

private struct StepDot: View {

    let stepNumber: Int
    let meta: EventFormView.StepMeta
    let isActive: Bool
    let isCompleted: Bool
    let isTappable: Bool
    let onTap: () -> Void

    @ScaledMetric(relativeTo: .caption) private var dotSize: CGFloat = 28

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(
                        isCompleted
                            ? SolennixColors.primary
                            : (isActive ? SolennixColors.primary.opacity(0.15) : SolennixColors.surfaceAlt)
                    )
                    .frame(width: dotSize, height: dotSize)

                Image(systemName: isCompleted ? "checkmark" : meta.icon)
                    .font(.caption)
                    .foregroundStyle(
                        isCompleted
                            ? SolennixColors.textInverse
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
        .accessibilityLabel(a11yLabel)
        .accessibilityValue(a11yValue)
        .accessibilityAddTraits(
            isActive
                ? (isTappable ? [.isButton, .isSelected] : [.isSelected])
                : (isTappable ? [.isButton] : [])
        )
        .onTapGesture {
            if isTappable { onTap() }
        }
    }

    private var a11yLabel: String {
        FeatureL10n.text(
            "events.form.step.a11y.label.\(stepNumber)",
            "Paso \(stepNumber): \(meta.label)"
        )
    }

    private var a11yValue: String {
        if isActive    { return FeatureL10n.text("events.form.step.a11y.active",    "Activo")     }
        if isCompleted { return FeatureL10n.text("events.form.step.a11y.completed", "Completado") }
        return FeatureL10n.text("events.form.step.a11y.pending", "Pendiente")
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
