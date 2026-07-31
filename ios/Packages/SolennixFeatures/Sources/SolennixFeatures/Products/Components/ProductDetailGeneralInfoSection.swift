import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Product Detail General Info Section

/// Static "general info" card: category, base price and composition summary.
/// Reads the item counts from the view model so the summary stays in sync.
struct ProductDetailGeneralInfoSection: View {

    let product: Product
    let viewModel: ProductDetailViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(ProductStrings.generalInfo)
                .font(.caption.weight(.semibold))
                .foregroundStyle(SolennixColors.textSecondary)

            HStack(spacing: Spacing.md) {
                Image(systemName: "tag.fill")
                    .foregroundStyle(SolennixColors.primary)
                VStack(alignment: .leading, spacing: 2) {
                    Text(ProductStrings.category)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                    Text(product.category)
                        .font(.subheadline.weight(.medium))
                }
            }

            Divider()

            HStack(spacing: Spacing.md) {
                Image(systemName: "dollarsign.circle.fill")
                    .foregroundStyle(SolennixColors.primary)
                VStack(alignment: .leading, spacing: 2) {
                    Text(ProductStrings.basePrice)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                    Text(product.basePrice.formatted(.currency(code: "MXN")))
                        .font(.subheadline.weight(.medium))
                }
            }

            Divider()

            HStack(spacing: Spacing.md) {
                Image(systemName: "square.stack.3d.up.fill")
                    .foregroundStyle(SolennixColors.primary)
                VStack(alignment: .leading, spacing: 2) {
                    Text(ProductStrings.composition)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                    Text(ProductStrings.compositionSummary(
                        ingredients: viewModel.ingredientItems.count,
                        supplies: viewModel.supplyItems.count,
                        equipment: viewModel.equipmentItems.count
                    ))
                    .font(.subheadline.weight(.medium))
                }
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
        .padding(.horizontal, Spacing.md)
    }
}
