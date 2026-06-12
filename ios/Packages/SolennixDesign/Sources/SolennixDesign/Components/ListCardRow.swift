import SwiftUI

// MARK: - ListCardRow

/// A reusable list-row wrapper that owns all list chrome shared across entity list screens
/// (events, clients, etc.).
///
/// The content closure is expected to provide a fully-styled card (background, corner radius,
/// shadow). `ListCardRow` itself is responsible for:
/// - List row insets: leading/trailing `Spacing.md`, vertical `Spacing.xs`
/// - List row separators hidden; row background cleared
/// - When a navigation value is provided: an opacity-0 `NavigationLink(value:)` overlaid on the
///   card so taps navigate without showing the disclosure chevron
/// - Accessibility: composed label + `.isButton` trait; the invisible link is hidden from VoiceOver
///
/// The generic `NavigationValue` parameter lets this component live in SolennixDesign without
/// importing SolennixCore. Callers pass their concrete `Route` (or any other `Hashable` type).
///
/// Usage — with navigation:
/// ```swift
/// ListCardRow(navigationValue: Route.clientDetail(id: client.id),
///             accessibilityLabel: "Name, City, 3 eventos, $5,000 total") {
///     clientCardContent(client)  // already styled with card background/clip/shadow
/// }
/// ```
/// Usage — without navigation (e.g. inside a grid where the parent `NavigationLink` wraps):
/// ```swift
/// ListCardRow(accessibilityLabel: "…") {
///     clientCardContent(client)
/// }
/// ```
public struct ListCardRow<NavigationValue: Hashable, Content: View>: View {

    private let navigationValue: NavigationValue?
    private let accessibilityLabel: String?
    private let content: () -> Content

    // MARK: - Init (with navigation)

    public init(
        navigationValue: NavigationValue,
        accessibilityLabel: String? = nil,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.navigationValue = navigationValue
        self.accessibilityLabel = accessibilityLabel
        self.content = content
    }

    // MARK: - Body

    public var body: some View {
        cardContent
            .listRowInsets(EdgeInsets(
                top: Spacing.xs,
                leading: Spacing.md,
                bottom: Spacing.xs,
                trailing: Spacing.md
            ))
            .listRowSeparator(.hidden)
            .listRowBackground(Color.clear)
    }

    @ViewBuilder
    private var cardContent: some View {
        if let navValue = navigationValue {
            content()
                .overlay {
                    NavigationLink(value: navValue) { EmptyView() }
                        .opacity(0)
                        .accessibilityHidden(true)
                }
                .accessibilityElement(children: .ignore)
                .modifier(OptionalAccessibilityLabel(label: accessibilityLabel))
                .accessibilityAddTraits(.isButton)
        } else {
            content()
                .accessibilityElement(children: .ignore)
                .modifier(OptionalAccessibilityLabel(label: accessibilityLabel))
                .accessibilityAddTraits(.isButton)
        }
    }
}

// MARK: - Init (no navigation — NavigationValue = Never)

extension ListCardRow where NavigationValue == Never {
    public init(
        accessibilityLabel: String? = nil,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.navigationValue = nil
        self.accessibilityLabel = accessibilityLabel
        self.content = content
    }
}

// MARK: - Optional Accessibility Label Modifier

private struct OptionalAccessibilityLabel: ViewModifier {
    let label: String?

    func body(content: Content) -> some View {
        if let label {
            content.accessibilityLabel(label)
        } else {
            content
        }
    }
}

// MARK: - Preview

#if DEBUG
private struct _SampleCardContent: View {
    var body: some View {
        HStack {
            Circle()
                .fill(SolennixColors.avatarBackground)
                .frame(width: 40, height: 40)
            VStack(alignment: .leading) {
                Text("Sample Name")
                    .font(.subheadline).fontWeight(.semibold)
                Text("Ciudad de México")
                    .font(.caption).foregroundStyle(SolennixColors.textSecondary)
            }
            Spacer()
            Text("$5,000")
                .font(.subheadline).fontWeight(.bold)
                .foregroundStyle(SolennixColors.primary)
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
    }
}

#Preview("ListCardRow") {
    List {
        ListCardRow(accessibilityLabel: "Sample Name, Ciudad de México") {
            _SampleCardContent()
        }
        ListCardRow(accessibilityLabel: "Sample Name, Ciudad de México") {
            _SampleCardContent()
        }
    }
    .listStyle(.plain)
    .scrollContentBackground(.hidden)
    .background(SolennixColors.surfaceGrouped)
}
#endif
