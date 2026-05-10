import SwiftUI
import SolennixCore
import SolennixDesign

struct EventDetailHeaderCard: View {
    let event: Event
    let clientName: String?
    let month: String
    let day: String
    let dateLabel: String
    let dateValue: String
    let scheduleLabel: String
    let scheduleValue: String?
    let peopleLabel: String
    let peopleValue: String
    let locationLabel: String?
    let locationValue: String?
    let onStatusTap: () -> Void

    var body: some View {
        VStack(spacing: Spacing.md) {
            HStack(spacing: Spacing.md) {
                EventDetailDateBox(month: month, day: day)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(event.serviceType)
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    if let clientName, !clientName.isEmpty {
                        Text(clientName)
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }

                    Button(action: onStatusTap) {
                        StatusBadge(status: event.status.rawValue)
                    }
                }

                Spacer()
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: Spacing.sm) {
                EventDetailQuickInfoItem(icon: "calendar", label: dateLabel, value: dateValue)

                if let scheduleValue, !scheduleValue.isEmpty {
                    EventDetailQuickInfoItem(icon: "clock", label: scheduleLabel, value: scheduleValue)
                }

                EventDetailQuickInfoItem(icon: "person.2", label: peopleLabel, value: peopleValue)

                if let locationLabel, let locationValue, !locationValue.isEmpty {
                    EventDetailQuickInfoItem(icon: "mappin", label: locationLabel, value: locationValue)
                }
            }
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }
}

struct EventDetailClientInfoCard: View {
    let client: Client

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "person.circle.fill")
                    .font(.title2)
                    .foregroundStyle(SolennixColors.primary)

                VStack(alignment: .leading, spacing: 2) {
                    Text(client.name)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)

                    if let city = client.city, !city.isEmpty {
                        Text(city)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }

                Spacer()
            }

            HStack(spacing: Spacing.lg) {
                if !client.phone.isEmpty {
                    Label(client.phone, systemImage: "phone")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }

                if let email = client.email, !email.isEmpty {
                    Label(email, systemImage: "envelope")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .lineLimit(1)
                }
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
    }
}

struct EventDetailFinanceSummaryCard: View {
    let title: String
    let totalLabel: String
    let totalValue: String
    let profitLabel: String
    let profitValue: String
    let discountText: String?
    let taxText: String?
    let route: Route

    var body: some View {
        NavigationLink(value: route) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Image(systemName: "chart.bar.fill")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)

                    Text(title)
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }

                Divider().background(SolennixColors.border)

                HStack(spacing: Spacing.md) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(totalLabel)
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                            .textCase(.uppercase)
                        Text(totalValue)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundStyle(SolennixColors.primary)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text(profitLabel)
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                            .textCase(.uppercase)

                        Text(profitValue)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundStyle(SolennixColors.success)
                    }
                }

                if let discountText, !discountText.isEmpty {
                    Text(discountText)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.error)
                }

                if let taxText, !taxText.isEmpty {
                    Text(taxText)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            .padding(Spacing.lg)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
            .shadowSm()
        }
        .buttonStyle(.plain)
    }
}

struct EventDetailPaymentSummaryCard: View {
    let title: String
    let paymentsCount: Int
    let paidLabel: String
    let paidValue: String
    let balanceLabel: String
    let balanceValue: String
    let isFullyPaid: Bool
    let progress: Double
    let depositText: String?
    let isDepositMet: Bool
    let route: Route

    var body: some View {
        NavigationLink(value: route) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Image(systemName: "dollarsign.circle.fill")
                        .font(.body)
                        .foregroundStyle(SolennixColors.success)

                    Text(title)
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    Spacer()

                    Text("\(paymentsCount)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.primary)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, 2)
                        .background(SolennixColors.primaryLight)
                        .clipShape(Capsule())

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }

                Divider().background(SolennixColors.border)

                HStack(spacing: Spacing.sm) {
                    EventDetailMiniKPI(
                        label: paidLabel,
                        value: paidValue,
                        color: SolennixColors.success,
                        bgColor: SolennixColors.successBg
                    )
                    EventDetailMiniKPI(
                        label: balanceLabel,
                        value: balanceValue,
                        color: isFullyPaid ? SolennixColors.success : SolennixColors.error,
                        bgColor: isFullyPaid ? SolennixColors.successBg : SolennixColors.errorBg
                    )
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(SolennixColors.surfaceAlt)
                            .frame(height: 6)

                        RoundedRectangle(cornerRadius: 4)
                            .fill(SolennixColors.primary)
                            .frame(width: geo.size.width * clampedProgress, height: 6)
                    }
                }
                .frame(height: 6)

                HStack {
                    Spacer()
                    Text("\(String(format: "%.0f", progress))%")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.textSecondary)
                }

                if let depositText, !depositText.isEmpty {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: isDepositMet ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                            .font(.caption)
                            .foregroundStyle(isDepositMet ? SolennixColors.success : SolennixColors.warning)
                        Text(depositText)
                            .font(.caption)
                            .foregroundStyle(isDepositMet ? SolennixColors.success : SolennixColors.warning)
                    }
                }
            }
            .padding(Spacing.lg)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
            .shadowSm()
        }
        .buttonStyle(.plain)
    }

    private var clampedProgress: Double {
        min(max(progress, 0), 100) / 100
    }
}

struct EventDetailPaymentActionsCard: View {
    let recordTitle: String
    let settleTitle: String
    let depositTitle: String?
    let onRecord: () -> Void
    let onSettle: () -> Void
    let onDeposit: () -> Void

    var body: some View {
        VStack(spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                PremiumButton(title: recordTitle, fullWidth: true, action: onRecord)
                PremiumButton(title: settleTitle, fullWidth: true, action: onSettle)
            }

            if let depositTitle, !depositTitle.isEmpty {
                PremiumButton(title: depositTitle, fullWidth: true, action: onDeposit)
            }
        }
    }
}

struct EventDetailContentGridSection: View {
    let productsTitle: String
    let productsCount: Int
    let extrasTitle: String
    let extrasCount: Int
    let suppliesTitle: String
    let suppliesCount: Int
    let equipmentTitle: String
    let equipmentCount: Int
    let shoppingTitle: String
    let shoppingSubtitle: String?
    let staffTitle: String
    let staffCount: Int
    let photosTitle: String
    let photosCount: Int
    let eventId: String

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: Spacing.sm) {
            EventDetailSummaryNavCard(
                icon: "bag.fill",
                title: productsTitle,
                count: productsCount,
                subtitle: nil,
                color: SolennixColors.primary,
                route: Route.eventProducts(id: eventId)
            )

            EventDetailSummaryNavCard(
                icon: "sparkles",
                title: extrasTitle,
                count: extrasCount,
                subtitle: nil,
                color: SolennixColors.info,
                route: Route.eventExtras(id: eventId)
            )

            EventDetailSummaryNavCard(
                icon: "drop.fill",
                title: suppliesTitle,
                count: suppliesCount,
                subtitle: nil,
                color: SolennixColors.warning,
                route: Route.eventSupplies(id: eventId)
            )

            EventDetailSummaryNavCard(
                icon: "wrench.and.screwdriver.fill",
                title: equipmentTitle,
                count: equipmentCount,
                subtitle: nil,
                color: SolennixColors.success,
                route: Route.eventEquipment(id: eventId)
            )

            EventDetailSummaryNavCard(
                icon: "cart.fill",
                title: shoppingTitle,
                subtitle: shoppingSubtitle,
                color: SolennixColors.error,
                route: Route.eventShoppingList(id: eventId)
            )

            EventDetailSummaryNavCard(
                icon: "person.3.fill",
                title: staffTitle,
                count: staffCount,
                subtitle: nil,
                color: SolennixColors.info,
                route: Route.eventStaff(id: eventId)
            )

            EventDetailPhotosSummaryCard(
                title: photosTitle,
                count: photosCount,
                route: Route.eventPhotos(id: eventId)
            )
        }
    }
}

struct EventDetailPrimaryLinkCard: View {
    let icon: String
    let title: String
    let tint: Color
    let background: Color
    let route: Route

    var body: some View {
        NavigationLink(value: route) {
            HStack {
                Image(systemName: icon)
                    .font(.body)
                Text(title)
                    .font(.body)
                    .fontWeight(.medium)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .foregroundStyle(tint)
            .padding(Spacing.md)
            .frame(maxWidth: .infinity)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        }
        .buttonStyle(.plain)
    }
}

struct EventDetailPrimaryButtonCard: View {
    let icon: String
    let title: String
    let tint: Color
    let background: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .font(.body)
                Text(title)
                    .font(.body)
                    .fontWeight(.medium)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .foregroundStyle(tint)
            .padding(Spacing.md)
            .frame(maxWidth: .infinity)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        }
        .buttonStyle(.plain)
    }
}

struct EventDetailIconTileLinkCard: View {
    let icon: String
    let label: String
    let tint: Color
    let route: Route

    var body: some View {
        NavigationLink(value: route) {
            VStack(spacing: Spacing.xs) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(tint)

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
        .buttonStyle(.plain)
    }
}

struct EventDetailNotesCard: View {
    let title: String
    let notes: String

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "note.text")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.primary)
                Text(title)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            Text(notes)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
                .lineLimit(3)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
    }
}

struct EventDetailLiveActivityCard: View {
    let isActive: Bool
    let startTitle: String
    let stopTitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: isActive ? "stop.circle.fill" : "dot.radiowaves.left.and.right")
                    .font(.body)
                    .foregroundStyle(isActive ? SolennixColors.error : .white)
                    .symbolEffect(.pulse, isActive: isActive)

                Text(isActive ? stopTitle : startTitle)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(isActive ? SolennixColors.error : .white)

                Spacer()

                if isActive {
                    Circle()
                        .fill(SolennixColors.success)
                        .frame(width: 8, height: 8)
                }
            }
            .padding(Spacing.md)
            .frame(maxWidth: .infinity)
            .background(isActive ? SolennixColors.errorBg : SolennixColors.success)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        }
        .buttonStyle(.plain)
    }
}