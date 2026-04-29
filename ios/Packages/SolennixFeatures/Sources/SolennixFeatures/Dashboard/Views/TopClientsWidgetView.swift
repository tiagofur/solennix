import SwiftUI
import SolennixCore

struct TopClientsWidgetView: View {
    let clients: [TopClient]
    let isLoading: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Top Clientes", systemImage: "person.2")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Spacer()
            }

            if isLoading {
                ForEach(0..<3, id: \.self) { _ in
                    VStack {
                        Skeleton()
                            .frame(height: 10)
                    }
                    .padding(.vertical, 8)
                }
            } else if clients.isEmpty {
                Text("Sin datos de clientes aún")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                VStack(spacing: 12) {
                    ForEach(clients.prefix(5), id: \.id) { client in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(client.name)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .lineLimit(1)
                            HStack {
                                Text("\(client.eventCount) evento\(client.eventCount == 1 ? "" : "s")")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text(formatMXN(client.totalSpent))
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.primary)
                            }
                        }
                        .padding(.vertical, 8)
                        .padding(.horizontal, 12)
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                    }
                }
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(.systemGray5), lineWidth: 1)
        )
    }

    private func formatMXN(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "MXN"
        formatter.currencySymbol = "$"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount)) ?? "$0"
    }
}

struct Skeleton: View {
    @State private var isShimmering = false

    var body: some View {
        Color(.systemGray3)
            .opacity(isShimmering ? 0.5 : 0.3)
            .cornerRadius(4)
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
