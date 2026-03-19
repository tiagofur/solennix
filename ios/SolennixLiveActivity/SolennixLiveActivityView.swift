import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Live Activity Widget

/// Widget que muestra la Live Activity y Dynamic Island para eventos en curso.
struct SolennixLiveActivity: Widget {

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SolennixEventAttributes.self) { context in
            // MARK: - Lock Screen / Banner (Vista Expandida)
            lockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // MARK: - Dynamic Island Expandida
                DynamicIslandExpandedRegion(.leading) {
                    expandedLeading(context: context)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    expandedTrailing(context: context)
                }

                DynamicIslandExpandedRegion(.center) {
                    expandedCenter(context: context)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    expandedBottom(context: context)
                }
            } compactLeading: {
                // MARK: - Dynamic Island Compacta (Izquierda)
                compactLeading(context: context)
            } compactTrailing: {
                // MARK: - Dynamic Island Compacta (Derecha)
                compactTrailing(context: context)
            } minimal: {
                // MARK: - Dynamic Island Minimal
                minimalView(context: context)
            }
        }
    }

    // MARK: - Lock Screen View

    @ViewBuilder
    private func lockScreenView(context: ActivityViewContext<SolennixEventAttributes>) -> some View {
        VStack(spacing: 12) {
            // Encabezado: tipo de evento y estado
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: eventIcon(for: context.attributes.eventType))
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.8))

                    Text(context.attributes.eventType)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                }

                Spacer()

                statusBadge(context.state.statusLabel, status: context.state.status)
            }

            // Info del cliente y ubicación
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Label(context.attributes.clientName, systemImage: "person.fill")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.9))

                    Label(context.attributes.location, systemImage: "mappin")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.7))
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Label("\(context.attributes.guestCount)", systemImage: "person.2.fill")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.9))

                    Text(timerText(context.state))
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(.white.opacity(0.7))
                }
            }

            // Barra de progreso
            ProgressView(value: progressValue(for: context.state))
                .tint(statusColor(context.state.status))
                .background(.white.opacity(0.2))
                .clipShape(Capsule())
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [Color(red: 0.4, green: 0.3, blue: 0.6), Color(red: 0.2, green: 0.15, blue: 0.4)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }

    // MARK: - Dynamic Island Expandida

    @ViewBuilder
    private func expandedLeading(context: ActivityViewContext<SolennixEventAttributes>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Label(context.attributes.clientName, systemImage: "person.fill")
                .font(.caption)
                .foregroundStyle(.white)

            Label(context.attributes.location, systemImage: "mappin")
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.7))
        }
    }

    @ViewBuilder
    private func expandedTrailing(context: ActivityViewContext<SolennixEventAttributes>) -> some View {
        VStack(alignment: .trailing, spacing: 4) {
            Label("\(context.attributes.guestCount) personas", systemImage: "person.2.fill")
                .font(.caption)
                .foregroundStyle(.white)

            Text(timerText(context.state))
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundStyle(.white.opacity(0.7))
        }
    }

    @ViewBuilder
    private func expandedCenter(context: ActivityViewContext<SolennixEventAttributes>) -> some View {
        Text(context.attributes.eventType)
            .font(.headline)
            .fontWeight(.bold)
            .foregroundStyle(.white)
    }

    @ViewBuilder
    private func expandedBottom(context: ActivityViewContext<SolennixEventAttributes>) -> some View {
        HStack {
            statusBadge(context.state.statusLabel, status: context.state.status)
            Spacer()
        }
    }

    // MARK: - Dynamic Island Compacta

    @ViewBuilder
    private func compactLeading(context: ActivityViewContext<SolennixEventAttributes>) -> some View {
        Image(systemName: eventIcon(for: context.attributes.eventType))
            .font(.caption)
            .foregroundStyle(statusColor(context.state.status))
    }

    @ViewBuilder
    private func compactTrailing(context: ActivityViewContext<SolennixEventAttributes>) -> some View {
        Text(timerText(context.state))
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundStyle(statusColor(context.state.status))
    }

    // MARK: - Dynamic Island Minimal

    @ViewBuilder
    private func minimalView(context: ActivityViewContext<SolennixEventAttributes>) -> some View {
        Circle()
            .fill(statusColor(context.state.status))
            .frame(width: 12, height: 12)
    }

    // MARK: - Helpers

    /// Devuelve un icono SF Symbol apropiado según el tipo de evento.
    private func eventIcon(for eventType: String) -> String {
        let type = eventType.lowercased()
        if type.contains("banquete") || type.contains("comida") || type.contains("cena") {
            return "fork.knife"
        } else if type.contains("coffee") || type.contains("café") {
            return "cup.and.saucer.fill"
        } else if type.contains("boda") || type.contains("ceremonia") {
            return "heart.fill"
        } else if type.contains("cumpleaños") || type.contains("fiesta") {
            return "party.popper.fill"
        } else if type.contains("corporativo") || type.contains("empresa") {
            return "building.2.fill"
        } else {
            return "calendar.badge.clock"
        }
    }

    /// Badge de estado con color correspondiente.
    private func statusBadge(_ label: String, status: String) -> some View {
        Text(label)
            .font(.caption2)
            .fontWeight(.bold)
            .foregroundStyle(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor(status))
            .clipShape(Capsule())
    }

    /// Color asociado al estado del evento.
    private func statusColor(_ status: String) -> Color {
        switch status {
        case "setup":       return .orange
        case "in_progress": return .green
        case "completed":   return .blue
        default:            return .gray
        }
    }

    /// Texto del temporizador basado en minutos transcurridos.
    private func timerText(_ state: SolennixEventAttributes.ContentState) -> String {
        let hours = state.elapsedMinutes / 60
        let minutes = state.elapsedMinutes % 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes) min"
    }

    /// Valor de progreso (0.0 - 1.0) según el estado.
    private func progressValue(for state: SolennixEventAttributes.ContentState) -> Double {
        switch state.status {
        case "setup":       return 0.25
        case "in_progress": return 0.6
        case "completed":   return 1.0
        default:            return 0.0
        }
    }
}
