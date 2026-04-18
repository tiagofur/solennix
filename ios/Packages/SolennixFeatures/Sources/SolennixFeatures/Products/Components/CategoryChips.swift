import SwiftUI
import SolennixDesign

// MARK: - Category Chips

/// Horizontal scrolling category filter chips
public struct CategoryChips: View {

    let categories: [String]
    @Binding var selectedCategory: String?
    let onToggle: (String) -> Void

    public init(
        categories: [String],
        selectedCategory: Binding<String?>,
        onToggle: @escaping (String) -> Void
    ) {
        self.categories = categories
        self._selectedCategory = selectedCategory
        self.onToggle = onToggle
    }

    public var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.xs) {
                ForEach(categories, id: \.self) { category in
                    CategoryChip(
                        title: category,
                        isSelected: selectedCategory == category
                    ) {
                        onToggle(category)
                    }
                }
            }
            .padding(.horizontal, Spacing.lg)
        }
    }
}

// MARK: - Category Chip

struct CategoryChip: View {

    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .fontWeight(.semibold)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, 6)
                .background(isSelected ? SolennixColors.primary : SolennixColors.card)
                .foregroundStyle(isSelected ? .white : SolennixColors.textSecondary)
                .clipShape(Capsule())
                .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Preview

#Preview("Category Chips") {
    struct PreviewWrapper: View {
        @State private var selected: String? = "Paquetes"

        var body: some View {
            VStack {
                CategoryChips(
                    categories: ["Paquetes", "Entradas", "Platos Fuertes", "Postres", "Bebidas"],
                    selectedCategory: $selected
                ) { category in
                    if selected == category {
                        selected = nil
                    } else {
                        selected = category
                    }
                }
            }
            .padding()
        }
    }

    return PreviewWrapper()
}
