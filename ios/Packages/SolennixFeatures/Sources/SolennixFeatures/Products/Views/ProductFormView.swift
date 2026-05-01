import SwiftUI
import PhotosUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Product Form View

public struct ProductFormView: View {

    @State private var viewModel: ProductFormViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(PlanLimitsManager.self) private var planLimitsManager

    public init(apiClient: APIClient, productId: String? = nil) {
        _viewModel = State(initialValue: ProductFormViewModel(apiClient: apiClient, productId: productId))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView(ProductStrings.loading)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                formContent
            }
        }
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(viewModel.isEditing ? ProductStrings.editProductTitle : ProductStrings.newProductTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                saveButton
            }
        }
        .sheet(isPresented: $viewModel.showCategoryPicker) {
            categoryPickerSheet
        }
        .task { await viewModel.loadData() }
        .onChange(of: viewModel.selectedPhoto) { _, _ in
            Task { await viewModel.handlePhotoSelection() }
        }
        .alert(ProductStrings.alertErrorTitle, isPresented: .init(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button(ProductStrings.ok) { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .sheet(isPresented: .init(
            get: { viewModel.planLimitMessage != nil },
            set: { if !$0 { viewModel.planLimitMessage = nil } }
        )) {
            PaywallSheet(
                message: viewModel.planLimitMessage ?? "",
                onUpgrade: {
                    viewModel.planLimitMessage = nil
                    dismiss()
                },
                onDismiss: {
                    viewModel.planLimitMessage = nil
                }
            )
        }
    }

    // MARK: - Form Content

    private var formContent: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Image section
                imageSection

                // Basic info section
                basicInfoSection

                // Recipe sections
                RecipeSection(
                    title: ProductStrings.compositionTitle,
                    description: ProductStrings.compositionDescription,
                    items: viewModel.ingredients,
                    inventoryItems: viewModel.ingredientInventoryItems,
                    onAdd: { viewModel.addIngredient() },
                    onRemove: { viewModel.removeIngredient(at: $0) },
                    onSelectInventory: { viewModel.updateIngredient(at: $0, inventoryId: $1) },
                    onUpdateQuantity: { index, qty in
                        viewModel.ingredients[index].quantityRequired = qty
                    },
                    showCost: true
                )

                RecipeSection(
                    title: ProductStrings.equipmentTitle,
                    description: ProductStrings.equipmentDescription,
                    items: viewModel.equipment,
                    inventoryItems: viewModel.equipmentInventoryItems,
                    onAdd: { viewModel.addEquipment() },
                    onRemove: { viewModel.removeEquipment(at: $0) },
                    onSelectInventory: { viewModel.updateEquipment(at: $0, inventoryId: $1) },
                    onUpdateQuantity: { index, qty in
                        viewModel.equipment[index].quantityRequired = qty
                    },
                    showCost: false
                )

                RecipeSection(
                    title: ProductStrings.suppliesTitle,
                    description: ProductStrings.suppliesDescription,
                    items: viewModel.supplies,
                    inventoryItems: viewModel.supplyInventoryItems,
                    onAdd: { viewModel.addSupply() },
                    onRemove: { viewModel.removeSupply(at: $0) },
                    onSelectInventory: { viewModel.updateSupply(at: $0, inventoryId: $1) },
                    onUpdateQuantity: { index, qty in
                        viewModel.supplies[index].quantityRequired = qty
                    },
                    showCost: true
                )

                staffTeamSection
            }
            .padding(Spacing.lg)
        }
    }

    // MARK: - Staff Team Section (Ola 3)

    private var staffTeamSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(ProductStrings.associatedTeam)
                .font(.headline)
                .foregroundStyle(SolennixColors.text)

            Text(ProductStrings.associatedTeamDescription)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)

            Menu {
                Button {
                    viewModel.staffTeamId = nil
                } label: {
                    Label(ProductStrings.noTeam, systemImage: viewModel.staffTeamId == nil ? "checkmark" : "")
                }

                if !viewModel.availableStaffTeams.isEmpty {
                    Divider()

                    ForEach(viewModel.availableStaffTeams) { team in
                        Button {
                            viewModel.staffTeamId = team.id
                        } label: {
                            let count = team.memberCount ?? team.members?.count ?? 0
                            let label = count > 0 ? "\(team.name) (\(count))" : team.name
                            Label(label, systemImage: viewModel.staffTeamId == team.id ? "checkmark" : "")
                        }
                    }
                }
            } label: {
                HStack {
                    Image(systemName: "person.3.fill")
                        .foregroundStyle(SolennixColors.primary)

                    Text(selectedTeamLabel)
                        .foregroundStyle(viewModel.staffTeamId == nil ? SolennixColors.textTertiary : SolennixColors.text)

                    Spacer()

                    Image(systemName: "chevron.down")
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .padding(Spacing.md)
                .background(SolennixColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .stroke(SolennixColors.border, lineWidth: 1)
                )
            }

            if viewModel.availableStaffTeams.isEmpty {
                Text(ProductStrings.addTeamsHint)
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }

    private var selectedTeamLabel: String {
        guard let id = viewModel.staffTeamId,
              let team = viewModel.availableStaffTeams.first(where: { $0.id == id }) else {
            return ProductStrings.noTeam
        }
        return team.name
    }

    // MARK: - Image Section

    private var imageSection: some View {
        VStack(alignment: .center, spacing: Spacing.sm) {
            PhotosPicker(
                selection: $viewModel.selectedPhoto,
                matching: .images,
                photoLibrary: .shared()
            ) {
                ZStack {
                    if let data = viewModel.localImageData,
                       let uiImage = UIImage(data: data) {
                        Image(uiImage: uiImage)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } else if let imageUrl = viewModel.imageUrl,
                              let url = APIClient.resolveURL(imageUrl) {
                        AsyncImage(url: url) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            imagePlaceholder
                        }
                    } else {
                        imagePlaceholder
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 200)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.lg)
                        .stroke(SolennixColors.border, style: StrokeStyle(lineWidth: 2, dash: [8]))
                )
            }
        }
    }

    private var imagePlaceholder: some View {
        VStack(spacing: Spacing.sm) {
            Image(systemName: "camera.fill")
                .font(.system(size: 32))
                .foregroundStyle(SolennixColors.textTertiary)

            Text(ProductStrings.addPhoto)
                .font(.caption)
                .foregroundStyle(SolennixColors.textTertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SolennixColors.surface)
    }

    // MARK: - Basic Info Section

    private var basicInfoSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(ProductStrings.productInfo)
                .font(.headline)
                .foregroundStyle(SolennixColors.text)

            // Name + Category
            AdaptiveFormRow {
                // Name
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(ProductStrings.name)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    TextField(ProductStrings.namePlaceholder, text: $viewModel.name)
                        .textFieldStyle(.roundedBorder)

                    if let error = viewModel.nameError {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.error)
                    }
                }
            } right: {
                // Category
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(ProductStrings.category)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Button {
                        viewModel.showCategoryPicker = true
                    } label: {
                        HStack {
                            Text(viewModel.category.isEmpty ? ProductStrings.selectCategory : viewModel.category)
                                .foregroundStyle(viewModel.category.isEmpty ? SolennixColors.textTertiary : SolennixColors.text)

                            Spacer()

                            Image(systemName: "chevron.down")
                                .foregroundStyle(SolennixColors.textTertiary)
                        }
                        .padding(Spacing.md)
                        .background(SolennixColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.md)
                                .stroke(viewModel.categoryError != nil ? SolennixColors.error : SolennixColors.border, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)

                    if let error = viewModel.categoryError {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.error)
                    }
                }
            }

            // Price + Active
            AdaptiveFormRow {
                // Base Price
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(ProductStrings.basePrice)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)

                    HStack {
                        Text("$")
                            .foregroundStyle(SolennixColors.textSecondary)

                        TextField("0.00", value: $viewModel.basePrice, format: .number)
                            .keyboardType(.decimalPad)
                            .textFieldStyle(.roundedBorder)
                    }
                }
            } right: {
                // Active toggle
                Toggle(isOn: $viewModel.isActive) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(ProductStrings.activeProduct)
                            .font(.body)
                            .foregroundStyle(SolennixColors.text)

                        Text(ProductStrings.visibleInQuotes)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                }
                .tint(SolennixColors.primary)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }

    // MARK: - Category Picker Sheet

    private var categoryPickerSheet: some View {
        NavigationStack {
            List {
                // Existing categories
                if !viewModel.existingCategories.isEmpty {
                    Section(ProductStrings.existingCategories) {
                        ForEach(viewModel.existingCategories, id: \.self) { cat in
                            Button {
                                viewModel.selectCategory(cat)
                            } label: {
                                HStack {
                                    Text(cat)
                                        .foregroundStyle(SolennixColors.text)

                                    Spacer()

                                    if viewModel.category == cat {
                                        Image(systemName: "checkmark")
                                            .foregroundStyle(SolennixColors.primary)
                                    }
                                }
                            }
                        }
                    }
                }

                // Custom category
                Section(ProductStrings.newCategory) {
                    HStack {
                        TextField(ProductStrings.newCategoryPlaceholder, text: $viewModel.customCategory)

                        Button {
                            viewModel.selectCustomCategory()
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .foregroundStyle(
                                    viewModel.customCategory.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                                        ? SolennixColors.textTertiary
                                        : SolennixColors.primary
                                )
                        }
                        .disabled(viewModel.customCategory.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }
            }
            .navigationTitle(ProductStrings.selectCategoryTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(ProductStrings.close) {
                        viewModel.showCategoryPicker = false
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Save Button

    private var saveButton: some View {
        Button {
            Task {
                let success = await viewModel.save()
                if success {
                    dismiss()
                }
            }
        } label: {
            if viewModel.isSaving {
                ProgressView()
            } else {
                Text(ProductStrings.save)
                    .fontWeight(.semibold)
            }
        }
        .disabled(viewModel.isSaving)
    }
}

// MARK: - Preview

#Preview("New Product") {
    NavigationStack {
        ProductFormView(apiClient: APIClient())
    }
}

#Preview("Edit Product") {
    NavigationStack {
        ProductFormView(apiClient: APIClient(), productId: "prod-123")
    }
}
