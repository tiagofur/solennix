import SwiftUI
import SolennixCore
import SolennixDesign

struct TopClientsWidgetView: View {
    let clients: [TopClient]
    let isLoading: Bool

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Label(tr("dashboard.widgets.top_clients.title", "Top clientes"), systemImage: "person.2")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)
                Spacer()
            }

            if isLoading {
                ForEach(0..<3, id: \.self) { _ in
                    VStack {
                        Skeleton()
                            .frame(height: 10)
                    }
                    .padding(.vertical, Spacing.sm)
                }
            } else if clients.isEmpty {
                Text(tr("dashboard.widgets.top_clients.empty", "Sin clientes destacados"))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, Spacing.xl)
            } else {
                VStack(spacing: Spacing.sm) {
                    ForEach(clients.prefix(5), id: \.id) { client in
                        NavigationLink(value: Route.clientDetail(id: client.id)) {
                            VStack(alignment: .leading, spacing: Spacing.xs) {
                                Text(client.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(SolennixColors.text)
                                    .lineLimit(1)
                                HStack {
                                    Text(String.localizedStringWithFormat(
                                        tr(
                                            client.eventCount == 1
                                                ? "dashboard.widgets.top_clients.events_one"
                                                : "dashboard.widgets.top_clients.events_other",
                                            client.eventCount == 1 ? "%lld evento" : "%lld eventos"
                                        ),
                                        client.eventCount
                                    ))
                                        .font(.caption)
                                        .foregroundStyle(SolennixColors.textSecondary)
                                    Spacer()
                                    Text(DashboardFormatting.currencyMXN(client.totalSpent))
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                        .foregroundStyle(SolennixColors.text)
                                }
                            }
                            .padding(.vertical, Spacing.sm)
                            .padding(.horizontal, Spacing.md)
                            .background(SolennixColors.surfaceAlt)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(Spacing.lg)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(tr("dashboard.widgets.top_clients.title", "Top clientes"))
        .accessibilityValue(
            clients.isEmpty
                ? tr("dashboard.widgets.top_clients.empty", "Sin clientes destacados")
                : clients.prefix(5).map { "\($0.name): \(DashboardFormatting.currencyMXN($0.totalSpent))" }
                         .joined(separator: ", ")
        )
    }
}

struct Skeleton: View {
    @State private var isShimmering = false

    var body: some View {
        SolennixColors.surfaceAlt
            .opacity(isShimmering ? 0.5 : 0.3)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
            .animation(
                Animation.easeInOut(duration: 1).repeatForever(autoreverses: true),
                value: isShimmering
            )
            .onAppear {
                isShimmering = true
            }
    }
}

#Preview {
    VStack(spacing: 16) {
        TopClientsWidgetView(
            clients: [
                TopClient(id: "1", name: "Familia García", totalSpent: 15000, eventCount: 3),
                TopClient(id: "2", name: "Corporativo Acme", totalSpent: 12000, eventCount: 2),
                TopClient(id: "3", name: "Eventos Gómez", totalSpent: 8500, eventCount: 1),
            ],
            isLoading: false
        )
        
        TopClientsWidgetView(
            clients: [],
            isLoading: false
        )
        
        TopClientsWidgetView(
            clients: [],
            isLoading: true
        )
    }
    .padding()
}
