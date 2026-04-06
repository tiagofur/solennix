import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Client Detail View

public struct ClientDetailView: View {

    let clientId: String

    @State private var client: Client?
    @State private var events: [Event] = []
    @State private var isLoading: Bool = true
    @State private var errorMessage: String?
    @State private var showDeleteConfirm: Bool = false
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @Environment(\.horizontalSizeClass) private var sizeClass

    private let apiClient: APIClient

    public init(clientId: String, apiClient: APIClient) {
        self.clientId = clientId
        self.apiClient = apiClient
    }

    public var body: some View {
        Group {
            if isLoading && client == nil {
                ProgressView("Cargando cliente...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let client {
                scrollContent(client)
            } else {
                EmptyStateView(
                    icon: "exclamationmark.triangle",
                    title: "Error",
                    message: errorMessage ?? "No se pudo cargar el cliente"
                )
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(client?.name ?? "Cliente")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog(
            "Eliminar cliente",
            isPresented: $showDeleteConfirm
        ) {
            Button("Eliminar", role: .destructive) {
                Task {
                    do {
                        try await apiClient.delete(Endpoint.client(clientId))
                        dismiss()
                    } catch {
                        errorMessage = "Error al eliminar el cliente"
                    }
                }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Estas seguro de que quieres eliminar a \(client?.name ?? "este cliente")? Esta accion no se puede deshacer.")
        }
        .task { await loadData() }
    }

    // MARK: - Scroll Content

    private func scrollContent(_ client: Client) -> some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                headerCard(client)

                AdaptiveDetailLayout {
                    // Left: Contact info, notes
                    contactSection(client)
                } right: {
                    // Right: Stats (in header), recent events
                    eventHistorySection
                }

                actionButtons
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
        .refreshable { await loadData() }
    }

    // MARK: - Header Card

    private func headerCard(_ client: Client) -> some View {
        VStack(spacing: Spacing.md) {
            Avatar(name: client.name, photoURL: client.photoUrl, size: 72)

            Text(client.name)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)

            // Stats row
            HStack(spacing: Spacing.md) {
                statBox(
                    icon: "calendar",
                    value: "\(client.totalEvents ?? 0)",
                    label: "Eventos"
                )

                statBox(
                    icon: "dollarsign.circle",
                    value: (client.totalSpent ?? 0).asMXN,
                    label: "Total"
                )

                if let totalEvents = client.totalEvents, totalEvents > 0,
                   let totalSpent = client.totalSpent, totalSpent > 0 {
                    statBox(
                        icon: "chart.bar",
                        value: (totalSpent / Double(totalEvents)).asMXN,
                        label: "Promedio"
                    )
                }
            }
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }

    // MARK: - Stat Box

    private func statBox(icon: String, value: String, label: String) -> some View {
        VStack(spacing: Spacing.xs) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(SolennixColors.primary)

            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.text)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(label)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.sm)
        .background(SolennixColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    // MARK: - Contact Section

    private func contactSection(_ client: Client) -> some View {
        VStack(spacing: Spacing.sm) {
            // Phone
            if !client.phone.isEmpty {
                contactRow(
                    icon: "phone.fill",
                    iconBg: SolennixColors.success,
                    text: client.phone
                ) {
                    if let url = URL(string: "tel:\(client.phone)") {
                        openURL(url)
                    }
                }
            }

            // Email
            if let email = client.email, !email.isEmpty {
                contactRow(
                    icon: "envelope.fill",
                    iconBg: SolennixColors.info,
                    text: email
                ) {
                    if let url = URL(string: "mailto:\(email)") {
                        openURL(url)
                    }
                }
            }

            // Address
            if let address = client.address, !address.isEmpty {
                let fullAddress = [address, client.city].compactMap { $0 }.joined(separator: ", ")
                contactRow(
                    icon: "mappin",
                    iconBg: SolennixColors.warning,
                    text: fullAddress
                )
            } else if let city = client.city, !city.isEmpty {
                contactRow(
                    icon: "mappin",
                    iconBg: SolennixColors.warning,
                    text: city
                )
            }

            // Notes
            if let notes = client.notes, !notes.isEmpty {
                contactRow(
                    icon: "note.text",
                    iconBg: SolennixColors.primary.opacity(0.1),
                    iconFg: SolennixColors.primary,
                    text: notes
                )
            }
        }
    }

    // MARK: - Contact Row

    private func contactRow(
        icon: String,
        iconBg: Color,
        iconFg: Color = .white,
        text: String,
        action: (() -> Void)? = nil
    ) -> some View {
        Button {
            action?()
        } label: {
            HStack(spacing: Spacing.md) {
                Image(systemName: icon)
                    .font(.body)
                    .foregroundStyle(iconFg)
                    .frame(width: 36, height: 36)
                    .background(iconBg)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))

                Text(text)
                    .font(.body)
                    .foregroundStyle(SolennixColors.text)
                    .multilineTextAlignment(.leading)

                Spacer()

                if action != nil {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }
            .padding(Spacing.md)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: Spacing.sm) {
            NavigationLink(value: Route.eventForm(clientId: clientId)) {
                actionButton(
                    icon: "calendar.badge.plus",
                    label: "Crear Evento",
                    fg: SolennixColors.primary
                )
            }

            NavigationLink(value: Route.clientForm(id: clientId)) {
                actionButton(
                    icon: "pencil",
                    label: "Editar",
                    fg: SolennixColors.info
                )
            }

            Button {
                showDeleteConfirm = true
            } label: {
                actionButton(
                    icon: "trash",
                    label: "Eliminar",
                    fg: SolennixColors.error
                )
            }
        }
    }

    private func actionButton(icon: String, label: String, fg: Color) -> some View {
        VStack(spacing: Spacing.xs) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(fg)

            Text(label)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
    }

    // MARK: - Event History Section

    private var eventHistorySection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Historial de Eventos (\(events.count))")
                .font(.headline)
                .foregroundStyle(SolennixColors.text)
                .padding(.horizontal, Spacing.xs)

            if events.isEmpty {
                HStack {
                    Spacer()
                    VStack(spacing: Spacing.sm) {
                        Image(systemName: "calendar")
                            .font(.title)
                            .foregroundStyle(SolennixColors.textTertiary)
                        Text("Este cliente no tiene eventos aun")
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                    .padding(.vertical, Spacing.xl)
                    Spacer()
                }
            } else {
                let sortedEvents = events.sorted { $0.eventDate > $1.eventDate }
                ForEach(sortedEvents) { event in
                    NavigationLink(value: Route.eventDetail(id: event.id)) {
                        eventRow(event)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Event Row

    private func eventRow(_ event: Event) -> some View {
        HStack(spacing: Spacing.md) {
            // Date box
            dateBox(event.eventDate)

            // Details
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(event.serviceType)
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                HStack(spacing: Spacing.sm) {
                    HStack(spacing: Spacing.xxs) {
                        Image(systemName: "person.2")
                            .font(.caption2)
                        Text("\(event.numPeople)")
                            .font(.caption)
                    }
                    .foregroundStyle(SolennixColors.textSecondary)

                    StatusBadge(status: event.status.rawValue)
                }
            }

            Spacer()

            Text(event.totalAmount.asMXN)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(SolennixColors.textTertiary)
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
    }

    // MARK: - Date Box

    private func dateBox(_ dateString: String) -> some View {
        let components = parseDateComponents(dateString)
        return VStack(spacing: Spacing.xxs) {
            Text(components.month)
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.primary)
                .textCase(.uppercase)

            Text(components.day)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)
        }
        .frame(width: 48, height: 48)
        .background(SolennixColors.primaryLight)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }

    private func parseDateComponents(_ dateString: String) -> (month: String, day: String) {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "es_MX")

        guard let date = formatter.date(from: String(dateString.prefix(10))) else {
            return ("---", "--")
        }

        let monthFormatter = DateFormatter()
        monthFormatter.dateFormat = "MMM"
        monthFormatter.locale = Locale(identifier: "es_MX")

        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "d"

        return (monthFormatter.string(from: date), dayFormatter.string(from: date))
    }

    // MARK: - Data Loading

    @MainActor
    private func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            async let clientResult: Client = apiClient.get(Endpoint.client(clientId))
            async let eventsResult: [Event] = apiClient.getAll(
                Endpoint.events,
                params: ["client_id": clientId]
            )

            client = try await clientResult
            events = try await eventsResult
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription
            } else {
                errorMessage = "Ocurrio un error inesperado."
            }
        }

        isLoading = false
    }
}

// MARK: - Preview

#Preview("Client Detail") {
    NavigationStack {
        ClientDetailView(clientId: "123", apiClient: APIClient())
    }
}
