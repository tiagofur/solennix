import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Quick Actions FAB

/// Floating action button that expands to show "Nuevo Evento" and "Cotización Rápida" actions.
///
/// Designed for iPhone compact layouts. The button rotates 45° when expanded
/// (turning the "+" into an "×").
public struct QuickActionsFAB: View {

    // MARK: - Properties

    @State private var isExpanded = false
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let onNewEvent: () -> Void
    private let onQuickQuote: () -> Void

    // MARK: - Init

    public init(
        onNewEvent: @escaping () -> Void,
        onQuickQuote: @escaping () -> Void
    ) {
        self.onNewEvent = onNewEvent
        self.onQuickQuote = onQuickQuote
    }

    // MARK: - Body

    public var body: some View {
        // Only show on compact (iPhone) layouts
        if sizeClass == .compact {
            fabContent
        }
    }

    @ViewBuilder
    private var fabContent: some View {
        VStack(spacing: Spacing.sm) {
            if isExpanded {
                // Quick Quote action
                fabAction(
                    icon: "bolt.fill",
                    label: QuickQuoteStrings.compactTitle,
                    action: {
                        withAnimation(reduceMotion ? nil : .spring(response: 0.3)) { isExpanded = false }
                        onQuickQuote()
                    }
                )
                .transition(.move(edge: .bottom).combined(with: .opacity))

                // New Event action
                fabAction(
                    icon: "calendar.badge.plus",
                    label: "Nuevo Evento",
                    action: {
                        withAnimation(reduceMotion ? nil : .spring(response: 0.3)) { isExpanded = false }
                        onNewEvent()
                    }
                )
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }

            // Main FAB button
            Button {
                withAnimation(reduceMotion ? nil : .spring(response: 0.3, dampingFraction: 0.7)) {
                    isExpanded.toggle()
                }
            } label: {
                Image(systemName: "plus")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .rotationEffect(.degrees(isExpanded ? 45 : 0))
                    .frame(width: 56, height: 56)
                    .background(SolennixColors.primary)
                    .clipShape(Circle())
                    .shadow(color: SolennixColors.primary.opacity(0.4), radius: 8, x: 0, y: 4)
            }
        }
        .padding(.trailing, Spacing.lg)
        .padding(.bottom, Spacing.lg)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
    }

    // MARK: - FAB Action Button

    private func fabAction(
        icon: String,
        label: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                Text(label)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                Image(systemName: icon)
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(SolennixColors.primary)
                    .clipShape(Circle())
            }
            .padding(.leading, Spacing.md)
            .padding(.trailing, Spacing.xs)
            .padding(.vertical, Spacing.xs)
            .background(SolennixColors.card)
            .clipShape(Capsule())
            .shadow(color: .black.opacity(0.15), radius: 6, x: 0, y: 3)
        }
    }
}

// MARK: - View Modifier

/// Overlay modifier that adds the QuickActionsFAB to any view.
public struct QuickActionsFABModifier: ViewModifier {
    let onNewEvent: () -> Void
    let onQuickQuote: () -> Void

    public func body(content: Content) -> some View {
        content.overlay {
            QuickActionsFAB(
                onNewEvent: onNewEvent,
                onQuickQuote: onQuickQuote
            )
        }
    }
}

public extension View {
    /// Adds a floating action button overlay with quick actions.
    func quickActionsFAB(
        onNewEvent: @escaping () -> Void,
        onQuickQuote: @escaping () -> Void
    ) -> some View {
        modifier(QuickActionsFABModifier(
            onNewEvent: onNewEvent,
            onQuickQuote: onQuickQuote
        ))
    }
}

// MARK: - Preview

#Preview {
    ZStack {
        Color.gray.opacity(0.1).ignoresSafeArea()
        Text("Content")
    }
    .quickActionsFAB(
        onNewEvent: {},
        onQuickQuote: {}
    )
}
