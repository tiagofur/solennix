import SwiftUI
import UIKit
import SolennixCore
import SolennixDesign
import SolennixNetwork

public struct QuickQuoteView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.apiClient) private var apiClient
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var viewModel: QuickQuoteViewModel
    var onConvertToEvent: (() -> Void)?

    public init(apiClient: APIClient, onConvertToEvent: (() -> Void)? = nil) {
        _viewModel = State(initialValue: QuickQuoteViewModel(apiClient: apiClient))
        self.onConvertToEvent = onConvertToEvent
    }
    
    public var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    Form {
                        Section {
                            DisclosureGroup(QuickQuoteStrings.clientData, isExpanded: $viewModel.showClientInfo) {
                                AdaptiveFormRow {
                                    TextField(QuickQuoteStrings.clientName, text: $viewModel.clientName)
                                        .textContentType(.name)
                                } right: {
                                    TextField(QuickQuoteStrings.phone, text: $viewModel.clientPhone)
                                        .keyboardType(.phonePad)
                                        .textContentType(.telephoneNumber)
                                }
                                TextField(QuickQuoteStrings.email, text: $viewModel.clientEmail)
                                    .keyboardType(.emailAddress)
                                    .textContentType(.emailAddress)
                                    .textInputAutocapitalization(.never)
                            }
                        }

                        Section(QuickQuoteStrings.basicData) {
                            HStack {
                                Image(systemName: "person.2")
                                    .foregroundStyle(SolennixColors.textSecondary)
                                TextField(QuickQuoteStrings.numPeople, value: $viewModel.numPeople, format: .number)
                                    .keyboardType(.numberPad)
                            }
                        }
                        
                        Section(QuickQuoteStrings.products) {
                            if sizeClass == .regular {
                                LazyVGrid(columns: [GridItem(.flexible(), spacing: Spacing.md), GridItem(.flexible(), spacing: Spacing.md)], spacing: Spacing.md) {
                                    ForEach($viewModel.selectedProducts) { $product in
                                        productRow(for: $product)
                                    }
                                }
                            } else {
                                ForEach($viewModel.selectedProducts) { $product in
                                    productRow(for: $product)
                                }
                                .onDelete(perform: viewModel.removeProduct)
                            }

                            Button(action: viewModel.addProduct) {
                                Label(QuickQuoteStrings.addProduct, systemImage: "plus")
                            }
                            .disabled(viewModel.availableProducts.isEmpty)
                        }

                        Section(QuickQuoteStrings.extras) {
                            if sizeClass == .regular {
                                LazyVGrid(columns: [GridItem(.flexible(), spacing: Spacing.md), GridItem(.flexible(), spacing: Spacing.md)], spacing: Spacing.md) {
                                    ForEach($viewModel.extras) { $extra in
                                        extraRow(for: $extra)
                                    }
                                }
                            } else {
                                ForEach($viewModel.extras) { $extra in
                                    extraRow(for: $extra)
                                }
                                .onDelete(perform: viewModel.removeExtra)
                            }

                            Button(action: viewModel.addExtra) {
                                Label(QuickQuoteStrings.addExtra, systemImage: "plus")
                            }
                        }
                        
                        Section(QuickQuoteStrings.discountBilling) {
                            AdaptiveFormRow {
                                Toggle(QuickQuoteStrings.invoiceRequired, isOn: $viewModel.requiresInvoice)
                            } right: {
                                Picker(QuickQuoteStrings.discountType, selection: $viewModel.discountType) {
                                    Text(QuickQuoteStrings.percentDiscount).tag(DiscountType.percent)
                                    Text(QuickQuoteStrings.fixedDiscount).tag(DiscountType.fixed)
                                }
                                .pickerStyle(.segmented)
                            }

                            HStack {
                                Text(QuickQuoteStrings.discount)
                                Spacer()
                                TextField("0", value: $viewModel.discountValue, format: .number)
                                    .keyboardType(.decimalPad)
                                    .multilineTextAlignment(.trailing)
                                    .frame(maxWidth: 100)
                            }
                        }
                        
                        Section(QuickQuoteStrings.summary) {
                            let fin = viewModel.financials
                            SummaryRow(label: QuickQuoteStrings.subtotalProducts, value: fin.productsSubtotal)
                            SummaryRow(label: QuickQuoteStrings.subtotalExtras, value: fin.extrasTotal)
                            
                            if fin.discountAmount > 0 {
                                SummaryRow(label: QuickQuoteStrings.discount, value: -fin.discountAmount)
                                    .foregroundStyle(SolennixColors.success)
                            }
                            
                            if viewModel.requiresInvoice {
                                SummaryRow(label: QuickQuoteStrings.vat, value: fin.taxAmount)
                            }
                            
                            HStack {
                                Text(QuickQuoteStrings.total)
                                    .font(.headline)
                                Spacer()
                                Text(fin.total.asMXN)
                                    .font(.headline)
                                    .foregroundStyle(SolennixColors.primary)
                            }
                        }

                        if viewModel.financials.totalCost > 0 {
                            Section(QuickQuoteStrings.profitabilityMetrics) {
                                let profitFin = viewModel.financials
                                SummaryRow(label: QuickQuoteStrings.productCost, value: profitFin.productCost)
                                SummaryRow(label: QuickQuoteStrings.extrasCost, value: profitFin.extrasCost)
                                SummaryRow(label: QuickQuoteStrings.totalCost, value: profitFin.totalCost)
                                HStack {
                                    Text(QuickQuoteStrings.netProfit)
                                        .foregroundStyle(SolennixColors.textSecondary)
                                    Spacer()
                                    Text(profitFin.profit.asMXN)
                                        .foregroundStyle(profitFin.profit >= 0 ? SolennixColors.success : .red)
                                }
                                HStack {
                                    Text(QuickQuoteStrings.margin)
                                        .foregroundStyle(SolennixColors.textSecondary)
                                    Spacer()
                                    Text(String(format: "%.1f%%", profitFin.margin))
                                        .foregroundStyle(profitFin.margin >= 0 ? SolennixColors.success : .red)
                                }
                            }
                        }
                        
                        Section(QuickQuoteStrings.export) {
                            Button {
                                viewModel.generatePDF(profile: nil)
                            } label: {
                                Label(QuickQuoteStrings.exportPDF, systemImage: "doc.text")
                            }
                            .disabled(viewModel.selectedProducts.isEmpty)
                        }
                    }
                    .scrollContentBackground(.hidden)
                    .background(SolennixColors.surfaceGrouped)
                }
            }
            .navigationTitle(QuickQuoteStrings.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(QuickQuoteStrings.close) {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(QuickQuoteStrings.convertToEvent) {
                        let transferData = QuickQuoteTransferData(
                            products: viewModel.selectedProducts.map { p in
                                let name = viewModel.availableProducts.first(where: { $0.id == p.productId })?.name ?? QuickQuoteStrings.product
                                return (productId: p.productId, productName: name, quantity: p.quantity, unitPrice: p.unitPrice)
                            },
                            extras: viewModel.extras.map { e in
                                (description: e.description, cost: e.cost, price: e.price, excludeUtility: e.excludeUtility)
                            },
                            discountType: viewModel.discountType,
                            discountValue: viewModel.discountValue,
                            requiresInvoice: viewModel.requiresInvoice,
                            numPeople: viewModel.numPeople
                        )
                        QuickQuoteDataHolder.shared.pendingData = transferData
                        onConvertToEvent?()
                        dismiss()
                    }
                    .fontWeight(.bold)
                    .disabled(viewModel.selectedProducts.isEmpty && viewModel.extras.isEmpty)
                }
            }
            .task {
                await viewModel.loadData()
            }
            .sheet(isPresented: $viewModel.showShareSheet) {
                if let data = viewModel.pdfData {
                    let tempURL = FileManager.default.temporaryDirectory
                        .appendingPathComponent(QuickQuoteStrings.pdfFileName)
                    let _ = try? data.write(to: tempURL)
                    ShareSheetView(activityItems: [tempURL])
                }
            }
        }
    }
    
    private func productRow(for product: Binding<EventProduct>) -> some View {
        VStack(spacing: Spacing.sm) {
            Picker(QuickQuoteStrings.product, selection: product.productId) {
                ForEach(viewModel.availableProducts) { p in
                    Text(p.name).tag(p.id)
                }
            }
            .onChange(of: product.productId.wrappedValue) { _, newValue in
                if let p = viewModel.availableProducts.first(where: { $0.id == newValue }) {
                    product.wrappedValue.unitPrice = p.basePrice
                    product.wrappedValue.discount = 0
                }
            }
            
            HStack {
                TextField(QuickQuoteStrings.quantity, value: product.quantity, format: .number)
                    .keyboardType(.numberPad)
                    .textFieldStyle(.roundedBorder)
                    .frame(maxWidth: 80)
                
                Spacer()
                
                Text(product.wrappedValue.unitPrice.asMXN)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
        }
        .padding(.vertical, Spacing.xs)
    }
    
    private func extraRow(for extra: Binding<EventExtra>) -> some View {
        VStack(spacing: Spacing.sm) {
            TextField(QuickQuoteStrings.description, text: extra.description)
            
            HStack {
                TextField(QuickQuoteStrings.cost, value: extra.cost, format: .number)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.roundedBorder)
                
                TextField(QuickQuoteStrings.price, value: extra.price, format: .number)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.roundedBorder)
            }
            
            Toggle(QuickQuoteStrings.passthrough, isOn: extra.excludeUtility)
                .font(.caption)
        }
        .padding(.vertical, Spacing.xs)
    }
}

private struct SummaryRow: View {
    let label: String
    let value: Double

    var body: some View {
        HStack {
            Text(label)
                .foregroundStyle(SolennixColors.textSecondary)
            Spacer()
            Text(value.asMXN)
        }
    }
}

// MARK: - Share Sheet

private struct ShareSheetView: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
