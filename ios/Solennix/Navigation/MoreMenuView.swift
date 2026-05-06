import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixFeatures
import SolennixNetwork

// MARK: - More Menu View

/// Root view for the "Más" tab on iPhone.
///
/// Uses value-based NavigationLinks (Route enum) instead of destination-based
/// links to prevent SwiftUI from popping detail views when the parent re-renders.
struct MoreMenuView: View {

    var body: some View {
        List {
            // Catalog section
            Section {
                NavigationLink(value: Route.productList) {
                    menuRow(
                        icon: "shippingbox.fill",
                        title: "Productos",
                        subtitle: "Catálogo y recetas",
                        color: SolennixColors.primary
                    )
                }

                NavigationLink(value: Route.inventoryList) {
                    menuRow(
                        icon: "archivebox.fill",
                        title: "Inventario",
                        subtitle: "Stock de ingredientes",
                        color: SolennixColors.warning
                    )
                }

                NavigationLink(value: Route.staffList) {
                    menuRow(
                        icon: "person.3.fill",
                        title: "Personal",
                        subtitle: "Colaboradores y equipo",
                        color: SolennixColors.info
                    )
                }

                NavigationLink(value: Route.eventFormLinks) {
                    menuRow(
                        icon: "link",
                        title: "Enlaces de Formulario",
                        subtitle: "Formularios para clientes nuevos",
                        color: SolennixColors.success
                    )
                }
            } header: {
                Text("Catálogo")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            // Settings section
            Section {
                NavigationLink(value: Route.paymentInbox) {
                    menuRow(
                        icon: "wallet.pass.fill",
                        title: "Comprobantes",
                        subtitle: "Revisión de pagos de clientes",
                        color: SolennixColors.primary
                    )
                }

                NavigationLink(value: Route.settings) {
                    menuRow(
                        icon: "gearshape.fill",
                        title: "Ajustes",
                        subtitle: "Perfil, negocio, cuenta",
                        color: SolennixColors.textSecondary
                    )
                }
            } header: {
                Text("Configuración")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Más")
        .navigationBarTitleDisplayMode(.large)
    }

    // MARK: - Menu Row

    private func menuRow(
        icon: String,
        title: String,
        subtitle: String,
        color: Color
    ) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(color)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(title)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)

                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
        }
        .padding(.vertical, Spacing.xs)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        MoreMenuView()
    }
}
