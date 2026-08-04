import SwiftUI
import SolennixCore
import SolennixNetwork
import SolennixDesign

/// Standalone host for push / deep-link entry into a single request (#1124).
public struct PublicRequestDetailHost: View {
    @State private var viewModel: RequestsInboxViewModel
    let requestId: String

    public init(apiClient: APIClient, requestId: String) {
        _viewModel = State(wrappedValue: RequestsInboxViewModel(apiClient: apiClient))
        self.requestId = requestId
    }

    public var body: some View {
        PublicRequestDetailView(viewModel: viewModel, requestId: requestId)
    }
}

/// Detail + inline actions for a single PublicRequest (#1122 / #1125).
public struct PublicRequestDetailView: View {

    @Bindable var viewModel: RequestsInboxViewModel
    let requestId: String
    /// Called after successful convert-to-event with the new event id (#1125).
    var onConvertedToEvent: ((String) -> Void)?

    @State private var showRespond = false
    @State private var showDecline = false
    @State private var quoteAmountText = ""
    @State private var currencyText = "MXN"
    @State private var validUntilText = RequestsInboxViewModel.defaultValidUntil()
    @State private var inclusionsText = ""
    @State private var respondMessage = ""
    @State private var declineReason = ""
    @State private var convertedEventId: String?
    @State private var successHaptic = 0
    @Environment(ToastManager.self) private var toastManager

    public init(
        viewModel: RequestsInboxViewModel,
        requestId: String,
        onConvertedToEvent: ((String) -> Void)? = nil
    ) {
        self.viewModel = viewModel
        self.requestId = requestId
        self.onConvertedToEvent = onConvertedToEvent
    }

    public var body: some View {
        Group {
            if viewModel.isLoadingDetail && viewModel.selectedDetail?.request.id != requestId {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let detail = viewModel.selectedDetail, detail.request.id == requestId {
                detailContent(detail)
            } else if let error = viewModel.errorMessage {
                ContentUnavailableView {
                    Label(RequestsStrings.errorLoadingTitle, systemImage: "exclamationmark.triangle")
                } description: {
                    Text(error)
                } actions: {
                    Button(RequestsStrings.actionRetry) {
                        Task { await viewModel.loadDetail(id: requestId) }
                    }
                }
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .navigationTitle(RequestsStrings.detailTitle)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadDetail(id: requestId)
        }
        .sheet(isPresented: $showRespond) {
            respondSheet
        }
        .sheet(isPresented: $showDecline) {
            declineSheet
        }
        .sensoryFeedback(.success, trigger: successHaptic) { old, new in new > old }
    }

    @ViewBuilder
    private func detailContent(_ detail: PublicRequestDetail) -> some View {
        let request = detail.request
        List {
            Section(RequestsStrings.sectionContact) {
                labeledRow(RequestsStrings.fieldEmail, value: request.contactEmail)
                if let name = request.contactName, !name.isEmpty {
                    labeledRow(RequestsStrings.fieldName, value: name)
                }
            }

            Section(RequestsStrings.sectionEvent) {
                labeledRow(
                    RequestsStrings.fieldType,
                    value: request.eventType ?? RequestsStrings.noEventType
                )
                if let date = request.eventDate, !date.isEmpty {
                    labeledRow(RequestsStrings.fieldDate, value: date)
                }
                if let location = request.location, !location.isEmpty {
                    labeledRow(RequestsStrings.fieldLocation, value: location)
                }
                if let guests = request.guestCount {
                    labeledRow(RequestsStrings.fieldGuests, value: "\(guests)")
                }
                if let budget = request.budget {
                    labeledRow(
                        RequestsStrings.fieldBudget,
                        value: String(format: "%.0f %@", budget, request.currency)
                    )
                }
                HStack {
                    Text(RequestsStrings.fieldStatus)
                    Spacer()
                    PublicRequestStatusBadge(status: request.status)
                }
            }

            if !request.services.isEmpty {
                Section(RequestsStrings.sectionServices) {
                    ForEach(request.services) { service in
                        HStack {
                            Text(service.name)
                            Spacer()
                            if let price = service.price {
                                Text(String(format: "%.0f", price))
                                    .foregroundStyle(SolennixColors.textSecondary)
                            }
                        }
                    }
                }
            }

            if let message = request.message, !message.isEmpty {
                Section(RequestsStrings.sectionMessage) {
                    Text(message)
                        .font(.body)
                }
            }

            if !detail.responses.isEmpty {
                Section(RequestsStrings.sectionResponses) {
                    ForEach(detail.responses) { response in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(String(format: "%.0f %@", response.quoteAmount, response.currency))
                                .font(.headline)
                            if let msg = response.message, !msg.isEmpty {
                                Text(msg)
                                    .font(.subheadline)
                                    .foregroundStyle(SolennixColors.textSecondary)
                            }
                            Text(response.createdAt)
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textTertiary)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }

            if canAct(on: request) {
                Section(RequestsStrings.sectionActions) {
                    if request.status == .pending || request.status == .infoRequested {
                        Button {
                            showRespond = true
                        } label: {
                            Label(RequestsStrings.actionRespond, systemImage: "paperplane.fill")
                        }
                        .disabled(viewModel.actionInFlight)

                        if request.status == .pending {
                            Button {
                                Task {
                                    if await viewModel.requestInfo(id: request.id) {
                                        toast(RequestsStrings.toastInfoRequested)
                                    }
                                }
                            } label: {
                                Label(RequestsStrings.actionRequestInfo, systemImage: "questionmark.bubble")
                            }
                            .disabled(viewModel.actionInFlight)
                        }

                        Button(role: .destructive) {
                            showDecline = true
                        } label: {
                            Label(RequestsStrings.actionDecline, systemImage: "xmark.circle")
                        }
                        .disabled(viewModel.actionInFlight)
                    }

                    if request.status == .acceptedByClient {
                        Button {
                            Task {
                                if let eventId = await viewModel.convertToEvent(id: request.id) {
                                    toast(RequestsStrings.toastConverted)
                                    convertedEventId = eventId
                                    onConvertedToEvent?(eventId)
                                }
                            }
                        } label: {
                            Label(RequestsStrings.actionConvert, systemImage: "calendar.badge.plus")
                        }
                        .disabled(viewModel.actionInFlight)
                    }

                    if let eventId = convertedEventId ?? request.eventId {
                        NavigationLink(value: Route.eventDetail(id: eventId)) {
                            Label(RequestsStrings.viewEvent, systemImage: "calendar")
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .solennixListStyle()
    }

    private func canAct(on request: PublicRequest) -> Bool {
        switch request.status {
        case .pending, .infoRequested, .acceptedByClient:
            return true
        default:
            return false
        }
    }

    private func labeledRow(_ title: String, value: String) -> some View {
        HStack {
            Text(title)
                .foregroundStyle(SolennixColors.textSecondary)
            Spacer()
            Text(value)
                .multilineTextAlignment(.trailing)
        }
    }

    private var respondSheet: some View {
        NavigationStack {
            Form {
                Section {
                    TextField(RequestsStrings.respondAmount, text: $quoteAmountText)
                        .keyboardType(.decimalPad)
                    TextField(RequestsStrings.respondCurrency, text: $currencyText)
                        .textInputAutocapitalization(.characters)
                    DatePicker(
                        RequestsStrings.respondValidUntil,
                        selection: Binding(
                            get: {
                                Self.parseDay(validUntilText) ?? Calendar.current.date(byAdding: .day, value: 7, to: Date())!
                            },
                            set: { validUntilText = Self.formatDay($0) }
                        ),
                        displayedComponents: .date
                    )
                    TextField(RequestsStrings.respondInclusions, text: $inclusionsText, axis: .vertical)
                        .lineLimit(3...8)
                    TextField(RequestsStrings.respondMessage, text: $respondMessage, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle(RequestsStrings.respondTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(RequestsStrings.actionCancel) { showRespond = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(RequestsStrings.actionSend) {
                        Task {
                            guard let amount = Double(quoteAmountText.replacingOccurrences(of: ",", with: ".")) else {
                                return
                            }
                            let msg = respondMessage.trimmingCharacters(in: .whitespacesAndNewlines)
                            let inclusions = inclusionsText
                                .split(separator: "\n")
                                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                                .filter { !$0.isEmpty }
                            if await viewModel.respond(
                                id: requestId,
                                amount: amount,
                                currency: currencyText.trimmingCharacters(in: .whitespacesAndNewlines),
                                inclusions: inclusions,
                                validUntil: validUntilText,
                                message: msg.isEmpty ? nil : msg
                            ) {
                                showRespond = false
                                toast(RequestsStrings.toastResponded)
                            }
                        }
                    }
                    .disabled(viewModel.actionInFlight || Double(quoteAmountText.replacingOccurrences(of: ",", with: ".")) == nil)
                }
            }
        }
        .presentationDetents([.large, .medium])
    }

    private static func parseDay(_ value: String) -> Date? {
        dayFormatter.date(from: value)
    }

    private static func formatDay(_ date: Date) -> String {
        dayFormatter.string(from: date)
    }

    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private var declineSheet: some View {
        NavigationStack {
            Form {
                Section {
                    TextField(RequestsStrings.declineReason, text: $declineReason, axis: .vertical)
                        .lineLimit(2...5)
                }
            }
            .navigationTitle(RequestsStrings.declineTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(RequestsStrings.actionCancel) { showDecline = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(RequestsStrings.actionDecline, role: .destructive) {
                        Task {
                            let reason = declineReason.trimmingCharacters(in: .whitespacesAndNewlines)
                            if await viewModel.decline(
                                id: requestId,
                                reason: reason.isEmpty ? nil : reason
                            ) {
                                showDecline = false
                                toast(RequestsStrings.toastDeclined)
                            }
                        }
                    }
                    .disabled(viewModel.actionInFlight)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func toast(_ message: String) {
        successHaptic += 1
        toastManager.show(message: message, type: .success)
    }
}
