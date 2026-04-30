import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

private func tr(_ key: String, _ value: String) -> String {
    FeatureL10n.text(key, value)
}

private func trf(_ key: String, _ value: String, _ arg: String) -> String {
    String(format: tr(key, value), locale: FeatureL10n.locale, arg)
}

// MARK: - Step 3: Extras

struct Step3ExtrasView: View {

    @Bindable var viewModel: EventFormViewModel
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                Button {
                    viewModel.addExtra()
                } label: {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "plus.circle.fill")
                            .foregroundStyle(SolennixColors.primary)

                        Text(tr("events.form.extras.add", "Agregar extra"))
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(SolennixColors.primary)

                        Spacer()
                    }
                    .padding(Spacing.md)
                    .background(SolennixColors.primaryLight)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(SolennixColors.primary.opacity(0.3), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)

                if viewModel.extras.isEmpty {
                    VStack(spacing: Spacing.sm) {
                        Image(systemName: "star")
                            .font(.largeTitle)
                            .foregroundStyle(SolennixColors.textTertiary)

                        Text(tr("events.form.extras.empty_title", "Sin extras"))
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)

                        Text(tr("events.form.extras.empty_desc", "Agrega servicios o ítems adicionales"))
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.xxxl)
                } else {
                    let columns: [GridItem] = sizeClass == .regular
                        ? [GridItem(.flexible(), spacing: Spacing.md), GridItem(.flexible(), spacing: Spacing.md)]
                        : [GridItem(.flexible())]

                    LazyVGrid(columns: columns, spacing: Spacing.md) {
                        ForEach(Array(viewModel.extras.enumerated()), id: \.element.id) { index, extra in
                            ExtraRowView(
                                extra: extra,
                                index: index,
                                onRemove: { viewModel.removeExtra(at: index) },
                                onDescriptionChange: { newValue in
                                    guard viewModel.extras.indices.contains(index) else { return }
                                    viewModel.extras[index].description = newValue
                                },
                                onCostChange: { newCost in
                                    guard viewModel.extras.indices.contains(index) else { return }
                                    viewModel.extras[index].cost = newCost
                                    if viewModel.extras[index].excludeUtility {
                                        viewModel.extras[index].price = newCost
                                    }
                                },
                                onPriceChange: { newPrice in
                                    guard viewModel.extras.indices.contains(index) else { return }
                                    viewModel.extras[index].price = newPrice
                                },
                                onExcludeUtilityChange: { newValue in
                                    guard viewModel.extras.indices.contains(index) else { return }
                                    viewModel.extras[index].excludeUtility = newValue
                                    if newValue {
                                        viewModel.extras[index].price = viewModel.extras[index].cost
                                    }
                                },
                                onIncludeInChecklistChange: { newValue in
                                    guard viewModel.extras.indices.contains(index) else { return }
                                    viewModel.extras[index].includeInChecklist = newValue
                                }
                            )
                            .draggable(extra.id.uuidString) {
                                Text(extra.description.isEmpty ? trf("events.form.extras.row_title", "Extra %@", String(index + 1)) : extra.description)
                                    .padding(Spacing.sm)
                                    .background(SolennixColors.card)
                                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                            }
                            .dropDestination(for: String.self) { droppedItems, _ in
                                guard let sourceId = droppedItems.first,
                                      let sourceIndex = viewModel.extras.firstIndex(where: { $0.id.uuidString == sourceId }) else { return false }
                                viewModel.moveExtra(from: sourceIndex, to: index)
                                return true
                            }
                        }
                    }
                }

                if !viewModel.extras.isEmpty {
                    HStack {
                        Text(tr("events.form.finances.subtotal_extras", "Subtotal extras"))
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(SolennixColors.textSecondary)

                        Spacer()

                        Text(formatCurrency(viewModel.extrasSubtotal))
                            .font(.headline)
                            .foregroundStyle(SolennixColors.primary)
                    }
                    .padding(Spacing.md)
                    .background(SolennixColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }
            }
            .padding(Spacing.md)
        }
    }

    private func formatCurrency(_ value: Double) -> String {
        "$\(String(format: "%.2f", value))"
    }
}

// MARK: - Extra Row
//
// Subview con `extra` pasado por valor + callbacks. No indexa el array del
// VM, evita crashes out-of-bounds durante el remove (SwiftUI re-sampla las
// expresiones de .onChange y Bindings subscript antes de desmontar el view;
// si el array ya se achicó, `extras[staleIndex]` revienta).
//
// @State local de costText/priceText: autoritativo mientras el usuario
// tipia. Si bindeáramos el TextField directo al Double del modelo, el
// formatter lo re-escribiría en cada keystroke y pisaría decimales
// intermedios ("2.", "0.5"). Se hidrata SOLO onAppear + onChange del id.
private struct ExtraRowView: View {

    let extra: SelectedExtra
    let index: Int
    let onRemove: () -> Void
    let onDescriptionChange: (String) -> Void
    let onCostChange: (Double) -> Void
    let onPriceChange: (Double) -> Void
    let onExcludeUtilityChange: (Bool) -> Void
    let onIncludeInChecklistChange: (Bool) -> Void

    @State private var costText: String = ""
    @State private var priceText: String = ""

    var body: some View {
        VStack(spacing: Spacing.sm) {
            HStack {
                Text(trf("events.form.extras.row_title", "Extra %@", String(index + 1)))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)

                Spacer()

                Button {
                    onRemove()
                } label: {
                    Image(systemName: "trash")
                        .font(.body)
                        .foregroundStyle(SolennixColors.error)
                }
                .buttonStyle(.plain)
            }

            SolennixTextField(
                label: tr("events.form.extras.description", "Descripción"),
                text: Binding(
                    get: { extra.description },
                    set: onDescriptionChange
                ),
                placeholder: tr("events.form.extras.description_placeholder", "Descripción del extra"),
                leftIcon: "text.alignleft"
            )

            HStack(spacing: Spacing.sm) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(tr("events.form.extras.cost", "Costo"))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    currencyField(text: $costText)
                        .onChange(of: costText) { _, newValue in
                            let d = Double(newValue.replacingOccurrences(of: ",", with: ".")) ?? 0
                            onCostChange(d)
                        }
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(tr("events.form.extras.price", "Precio"))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    // Cuando excludeUtility está on, el display se deriva
                    // de costText — single source of truth en vez de
                    // sincronizar priceText a mano.
                    currencyField(
                        text: Binding<String>(
                            get: { extra.excludeUtility ? costText : priceText },
                            set: { newValue in
                                guard !extra.excludeUtility else { return }
                                priceText = newValue
                                let d = Double(newValue.replacingOccurrences(of: ",", with: ".")) ?? 0
                                onPriceChange(d)
                            }
                        )
                    )
                    .disabled(extra.excludeUtility)
                    .opacity(extra.excludeUtility ? 0.5 : 1.0)
                }
            }

            Toggle(isOn: Binding(
                get: { extra.excludeUtility },
                set: onExcludeUtilityChange
            )) {
                Text(tr("events.form.extras.exclude_utility", "Solo cobrar costo (sin utilidad)"))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
            .tint(SolennixColors.primary)
            .onChange(of: extra.excludeUtility) { _, newValue in
                if newValue {
                    // Sincroniza priceText para que al toggle off el field
                    // no muestre un valor stale.
                    priceText = costText
                }
            }

            Toggle(isOn: Binding(
                get: { extra.includeInChecklist },
                set: onIncludeInChecklistChange
            )) {
                Label {
                    Text(tr("events.form.extras.include_checklist", "Incluir en checklist"))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                } icon: {
                    Image(systemName: "checklist")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            .tint(SolennixColors.primary)
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(SolennixColors.border, lineWidth: 1)
        )
        .onAppear { hydrate(from: extra) }
        .onChange(of: extra.id) { _, _ in hydrate(from: extra) }
    }

    private func hydrate(from extra: SelectedExtra) {
        costText = extra.cost > 0 ? String(format: "%g", extra.cost) : ""
        priceText = extra.price > 0 ? String(format: "%g", extra.price) : ""
    }

    private func currencyField(text: Binding<String>) -> some View {
        HStack(spacing: Spacing.xs) {
            Text("$")
                .font(.body)
                .foregroundStyle(SolennixColors.textTertiary)

            TextField(tr("events.form.extras.amount_placeholder", "0.00"), text: text)
                .keyboardType(.decimalPad)
                .font(.body)
                .foregroundStyle(SolennixColors.text)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, 10)
        .background(SolennixColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(SolennixColors.border, lineWidth: 1)
        )
    }
}

// MARK: - Preview

#Preview("Step 3 - Extras") {
    Step3ExtrasView(viewModel: EventFormViewModel(apiClient: APIClient()))
}
