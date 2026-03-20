import SwiftUI
import UIKit
import SolennixCore
import SolennixDesign
import SolennixNetwork

public struct QuickQuoteView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.apiClient) private var apiClient
    @State private var viewModel: QuickQuoteViewModel
    
    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: QuickQuoteViewModel(apiClient: apiClient))
    }
    
    public var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    Form {
                        Section("Datos Básicos") {
                            HStack {
                                Image(systemName: "person.2")
                                    .foregroundStyle(SolennixColors.textSecondary)
                                TextField("Número de Personas", value: $viewModel.numPeople, format: .number)
                                    .keyboardType(.numberPad)
                            }
                        }
                        
                        Section("Productos") {
                            ForEach($viewModel.selectedProducts) { $product in
                                productRow(for: $product)
                            }
                            .onDelete(perform: viewModel.removeProduct)
                            
                            Button(action: viewModel.addProduct) {
                                Label("Agregar Producto", systemImage: "plus")
                            }
                            .disabled(viewModel.availableProducts.isEmpty)
                        }
                        
                        Section("Extras") {
                            ForEach($viewModel.extras) { $extra in
                                extraRow(for: $extra)
                            }
                            .onDelete(perform: viewModel.removeExtra)
                            
                            Button(action: viewModel.addExtra) {
                                Label("Agregar Extra", systemImage: "plus")
                            }
                        }
                        
                        Section("Descuento y Facturación") {
                            Toggle("Requiere Factura (IVA)", isOn: $viewModel.requiresInvoice)
                            
                            Picker("Tipo de Descuento", selection: $viewModel.discountType) {
                                Text("Porcentaje (%)").tag(DiscountType.percent)
                                Text("Monto Fijo ($)").tag(DiscountType.fixed)
                            }
                            .pickerStyle(.segmented)
                            
                            HStack {
                                Text("Descuento")
                                Spacer()
                                TextField("0", value: $viewModel.discountValue, format: .number)
                                    .keyboardType(.decimalPad)
                                    .multilineTextAlignment(.trailing)
                                    .frame(maxWidth: 100)
                            }
                        }
                        
                        Section("Resumen") {
                            let fin = viewModel.financials
                            SummaryRow(label: "Subtotal Productos", value: fin.productsSubtotal)
                            SummaryRow(label: "Subtotal Extras", value: fin.extrasTotal)
                            
                            if fin.discountAmount > 0 {
                                SummaryRow(label: "Descuento", value: -fin.discountAmount)
                                    .foregroundStyle(SolennixColors.success)
                            }
                            
                            if viewModel.requiresInvoice {
                                SummaryRow(label: "IVA", value: fin.taxAmount)
                            }
                            
                            HStack {
                                Text("Total")
                                    .font(.headline)
                                Spacer()
                                Text(fin.total.asMXN)
                                    .font(.headline)
                                    .foregroundStyle(SolennixColors.primary)
                            }
                        }
                        
                        Section("Exportar") {
                            Button {
                                viewModel.generatePDF(profile: nil)
                            } label: {
                                Label("Exportar PDF", systemImage: "doc.text")
                            }
                            .disabled(viewModel.selectedProducts.isEmpty)
                        }
                    }
                }
            }
            .navigationTitle("Cotización Rápida")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cerrar") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("A Evento") {
                        // Pass data to EventForm
                        dismiss()
                    }
                    .fontWeight(.bold)
                }
            }
            .task {
                await viewModel.loadData()
            }
            .sheet(isPresented: $viewModel.showShareSheet) {
                if let data = viewModel.pdfData {
                    let tempURL = FileManager.default.temporaryDirectory
                        .appendingPathComponent("CotizacionRapida.pdf")
                    let _ = try? data.write(to: tempURL)
                    ShareSheetView(activityItems: [tempURL])
                }
            }
        }
    }
    
    private func productRow(for product: Binding<EventProduct>) -> some View {
        VStack(spacing: Spacing.sm) {
            Picker("Producto", selection: product.productId) {
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
                TextField("Cantidad", value: product.quantity, format: .number)
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
            TextField("Descripción", text: extra.description)
            
            HStack {
                TextField("Costo", value: extra.cost, format: .number)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.roundedBorder)
                
                TextField("Precio", value: extra.price, format: .number)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.roundedBorder)
            }
            
            Toggle("Passthrough (Sin Utilidad)", isOn: extra.excludeUtility)
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

