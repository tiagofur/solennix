import SwiftUI

// MARK: - Adaptive Form Row

/// Places two views side-by-side on iPad (.regular), stacked on iPhone (.compact).
public struct AdaptiveFormRow<Left: View, Right: View>: View {
    @Environment(\.horizontalSizeClass) private var sizeClass

    private let left: Left
    private let right: Right
    private let spacing: CGFloat

    public init(
        spacing: CGFloat = Spacing.md,
        @ViewBuilder left: () -> Left,
        @ViewBuilder right: () -> Right
    ) {
        self.left = left()
        self.right = right()
        self.spacing = spacing
    }

    public var body: some View {
        if sizeClass == .regular {
            HStack(alignment: .top, spacing: spacing) {
                left
                right
            }
        } else {
            VStack(spacing: spacing) {
                left
                right
            }
        }
    }
}

// MARK: - Adaptive Detail Layout

/// Two-column detail layout on iPad, single column on iPhone.
/// Left column takes 50% width, right column takes 50%.
public struct AdaptiveDetailLayout<Left: View, Right: View>: View {
    @Environment(\.horizontalSizeClass) private var sizeClass

    private let left: Left
    private let right: Right
    private let spacing: CGFloat

    public init(
        spacing: CGFloat = Spacing.md,
        @ViewBuilder left: () -> Left,
        @ViewBuilder right: () -> Right
    ) {
        self.left = left()
        self.right = right()
        self.spacing = spacing
    }

    public var body: some View {
        if sizeClass == .regular {
            HStack(alignment: .top, spacing: spacing) {
                VStack(spacing: Spacing.md) { left }
                    .frame(maxWidth: .infinity)
                VStack(spacing: Spacing.md) { right }
                    .frame(maxWidth: .infinity)
            }
        } else {
            VStack(spacing: Spacing.md) {
                left
                right
            }
        }
    }
}

// MARK: - Adaptive Card Grid

/// Displays items in a multi-column grid on iPad, single column on iPhone.
public struct AdaptiveCardGrid<Data: RandomAccessCollection, Content: View>: View where Data.Element: Identifiable {
    @Environment(\.horizontalSizeClass) private var sizeClass

    private let data: Data
    private let minimumWidth: CGFloat
    private let spacing: CGFloat
    private let content: (Data.Element) -> Content

    public init(
        _ data: Data,
        minimumWidth: CGFloat = 300,
        spacing: CGFloat = Spacing.sm,
        @ViewBuilder content: @escaping (Data.Element) -> Content
    ) {
        self.data = data
        self.minimumWidth = minimumWidth
        self.spacing = spacing
        self.content = content
    }

    public var body: some View {
        if sizeClass == .regular {
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: minimumWidth), spacing: spacing)],
                spacing: spacing
            ) {
                ForEach(data) { item in
                    content(item)
                }
            }
        } else {
            LazyVStack(spacing: spacing) {
                ForEach(data) { item in
                    content(item)
                }
            }
        }
    }
}

// MARK: - Adaptive Centered Content

/// Centers content with max width on iPad for readability.
public struct AdaptiveCenteredContent<Content: View>: View {
    @Environment(\.horizontalSizeClass) private var sizeClass

    private let maxWidth: CGFloat
    private let content: Content

    public init(
        maxWidth: CGFloat = 600,
        @ViewBuilder content: () -> Content
    ) {
        self.maxWidth = maxWidth
        self.content = content()
    }

    public var body: some View {
        if sizeClass == .regular {
            content
                .frame(maxWidth: maxWidth)
                .frame(maxWidth: .infinity)
        } else {
            content
        }
    }
}

// MARK: - Adaptive Auth Layout

/// Split layout for auth screens: brand panel left (40%), form right (60%) on iPad.
/// Full-screen form on iPhone.
public struct AdaptiveAuthLayout<Form: View>: View {
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.colorScheme) private var colorScheme

    private let form: Form

    public init(@ViewBuilder form: () -> Form) {
        self.form = form()
    }

    public var body: some View {
        if sizeClass == .regular {
            HStack(spacing: 0) {
                // Brand panel
                VStack(spacing: Spacing.xl) {
                    Spacer()
                    Image(systemName: "sparkles")
                        .font(.system(size: 60))
                        .foregroundStyle(SolennixColors.primary)
                    Text("SOLENNIX")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                    Text("Tu negocio de eventos, organizado")
                        .font(.title3)
                        .foregroundStyle(.white.opacity(0.8))
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(
                    LinearGradient(
                        colors: [
                            SolennixColors.primary.opacity(0.9),
                            SolennixColors.primary.opacity(0.7)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

                // Form panel
                ScrollView {
                    form
                        .padding(Spacing.xxl)
                        .frame(maxWidth: 500)
                        .frame(maxWidth: .infinity)
                }
                .scrollDismissesKeyboard(.interactively)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(SolennixColors.background)
            }
        } else {
            ScrollView {
                form
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, Spacing.xxl)
            }
            .scrollDismissesKeyboard(.interactively)
        }
    }
}

// MARK: - View Extension

public extension View {
    /// Returns true when horizontal size class is `.regular` (iPad, large iPhone landscape).
    /// Use this in views where you need a simple boolean check.
    func isWideScreen(_ sizeClass: UserInterfaceSizeClass?) -> Bool {
        sizeClass == .regular
    }
}
