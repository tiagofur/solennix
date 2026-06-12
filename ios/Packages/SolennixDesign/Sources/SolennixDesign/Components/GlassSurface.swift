import SwiftUI

// MARK: - Adaptive Glass Modifier

/// Applies a native Liquid Glass effect on iOS 26+ and gracefully falls back to
/// `.ultraThinMaterial` on earlier OS versions.
///
/// **Golden rule:** use this only on floating navigation-layer elements —
/// bars, toolbars, sheets, popovers, FABs. Never on content cards or
/// scrollable content.
///
/// Usage:
/// ```swift
/// VStack { ... }
///     .adaptiveGlass(in: RoundedRectangle(cornerRadius: 16))
/// ```
public struct AdaptiveGlassModifier<S: Shape>: ViewModifier {
    let shape: S

    public func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content
                .glassEffect(.regular, in: shape)
        } else {
            content
                .background(shape.fill(.ultraThinMaterial))
        }
    }
}

public extension View {
    /// Applies Liquid Glass on iOS 26+ or `.ultraThinMaterial` on earlier versions.
    ///
    /// - Parameter shape: The clipping shape for the glass surface (e.g. `.circle`,
    ///   `RoundedRectangle(cornerRadius: 12)`). Defaults to `RoundedRectangle(cornerRadius: 16)`.
    func adaptiveGlass<S: Shape>(in shape: S) -> some View {
        modifier(AdaptiveGlassModifier(shape: shape))
    }

    /// Convenience overload using `RoundedRectangle(cornerRadius: 16)` as default shape.
    func adaptiveGlass() -> some View {
        adaptiveGlass(in: RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - GlassSurface (deprecated — use adaptiveGlass(in:) instead)

/// - Deprecated: Use `.adaptiveGlass(in:)` instead.
@available(*, deprecated, renamed: "adaptiveGlass(in:)", message: "Use .adaptiveGlass(in:) from AdaptiveGlassModifier.")
public struct GlassSurface: ViewModifier {
    var opacity: Double = 0.8
    var blur: Double = 10

    public init(opacity: Double = 0.8, blur: Double = 10) {
        self.opacity = opacity
        self.blur = blur
    }

    public func body(content: Content) -> some View {
        content
            .background(
                Color.black.opacity(0.1)
                    .blur(radius: blur)
            )
            .background(
                Color.white.opacity(opacity)
            )
    }
}

@available(*, deprecated, renamed: "adaptiveGlass(in:)", message: "Use .adaptiveGlass(in:) from AdaptiveGlassModifier.")
public extension View {
    func glassSurface(opacity: Double = 0.8, blur: Double = 10) -> some View {
        modifier(GlassSurface(opacity: opacity, blur: blur))
    }
}
