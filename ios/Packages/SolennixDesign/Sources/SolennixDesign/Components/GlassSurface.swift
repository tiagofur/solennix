import SwiftUI

// MARK: - Adaptive Glass Fallback

/// Controls how `adaptiveGlass` renders on iOS 17–25 where `glassEffect` is unavailable.
///
/// - `material`: standard `.ultraThinMaterial` — good on most light/dark backgrounds.
/// - `brightChip`: white-opacity fill — better on dark/navy sidebar surfaces where
///   `.ultraThinMaterial` is nearly invisible (preserves the original GlassSurface chip look).
public enum AdaptiveGlassFallback {
    /// Standard system material (`.ultraThinMaterial`).
    case material
    /// White-opacity chip — tuned for dark/navy sidebar backgrounds pre-iOS 26.
    case brightChip
}

// MARK: - Adaptive Glass Modifier

/// Applies a native Liquid Glass effect on iOS 26+ and gracefully falls back to
/// the chosen `fallback` style on earlier OS versions.
///
/// **Golden rule:** use this only on floating navigation-layer elements —
/// bars, toolbars, sheets, popovers, FABs. Never on content cards or
/// scrollable content.
///
/// Usage:
/// ```swift
/// VStack { ... }
///     .adaptiveGlass(in: RoundedRectangle(cornerRadius: 16))
///
/// // Navy sidebar — use brightChip so the chip is visible in dark mode pre-26:
/// HStack { ... }
///     .adaptiveGlass(in: RoundedRectangle(cornerRadius: 10), fallback: .brightChip)
/// ```
public struct AdaptiveGlassModifier<S: Shape>: ViewModifier {
    let shape: S
    let fallback: AdaptiveGlassFallback

    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    public func body(content: Content) -> some View {
        if reduceTransparency {
            // Accessibility first: when Reduce Transparency is ON, a translucent
            // material/glassEffect is an illegible blur. Replace it with a solid
            // opaque surface fill. This branch wins on EVERY OS — checked first so
            // it also short-circuits the iOS 26+ glassEffect (whose implicit morph
            // would otherwise fight the opaque fallback).
            content
                .background(shape.fill(SolennixColors.surface))
        } else if #available(iOS 26.0, *) {
            content
                .glassEffect(.regular, in: shape)
        } else {
            switch fallback {
            case .material:
                content
                    .background(shape.fill(.ultraThinMaterial))
            case .brightChip:
                // White-opacity chip that stays visible on the dark navy sidebar.
                // Mirrors the original GlassSurface appearance that adaptiveGlass replaced.
                content
                    .background(shape.fill(Color.white.opacity(0.12)))
            }
        }
    }
}

public extension View {
    /// Applies Liquid Glass on iOS 26+ or the chosen `fallback` on earlier versions.
    ///
    /// - Parameters:
    ///   - shape: The clipping shape (e.g. `.circle`, `RoundedRectangle(cornerRadius: 12)`).
    ///   - fallback: Pre-iOS 26 rendering. Default `.material`; use `.brightChip` on dark surfaces.
    func adaptiveGlass<S: Shape>(in shape: S, fallback: AdaptiveGlassFallback = .material) -> some View {
        modifier(AdaptiveGlassModifier(shape: shape, fallback: fallback))
    }

    /// Convenience overload using `RoundedRectangle(cornerRadius: 16)` as default shape.
    func adaptiveGlass(fallback: AdaptiveGlassFallback = .material) -> some View {
        adaptiveGlass(in: RoundedRectangle(cornerRadius: 16), fallback: fallback)
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
