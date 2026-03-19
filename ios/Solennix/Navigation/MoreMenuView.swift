import SwiftUI
import SolennixDesign
import SolennixFeatures
import SolennixNetwork

// MARK: - More Menu View

/// Root view for the "Más" tab on iPhone.
///
/// Provides access to Products, Inventory, Search, and Settings —
/// mirroring the drawer navigation from the React Native app.
struct MoreMenuView: View {

    @Environment(\.apiClient) private var apiClient

    var body: some View {
        List {
            // Events section
            Section {
                NavigationLink {
                    EventListView(apiClient: apiClient)
                } label: {
                    menuRow(
                        icon: "calendar.badge.clock",
                        title: "Eventos",
                        subtitle: "Lista completa de eventos",
                        color: SolennixColors.statusConfirmed
                    )
                }
            } header: {
                Text("Eventos")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            // Catalog section
            Section {
                NavigationLink {
                    ProductListView(apiClient: apiClient)
                } label: {
                    menuRow(
                        icon: "shippingbox.fill",
                        title: "Productos",
                        subtitle: "Catálogo y recetas",
                        color: SolennixColors.primary
                    )
                }

                NavigationLink {
                    InventoryListView(apiClient: apiClient)
                } label: {
                    menuRow(
                        icon: "archivebox.fill",
                        title: "Inventario",
                        subtitle: "Stock de ingredientes",
                        color: SolennixColors.warning
                    )
                }
            } header: {
                Text("Catálogo")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            // Tools section
            Section {
                NavigationLink {
                    SearchView()
                } label: {
                    menuRow(
                        icon: "magnifyingglass",
                        title: "Buscar",
                        subtitle: "Clientes, eventos, productos",
                        color: SolennixColors.info
                    )
                }
            } header: {
                Text("Herramientas")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            // Settings section
            Section {
                NavigationLink {
                    SettingsView(apiClient: apiClient)
                } label: {
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
