import SwiftUI

#if canImport(UIKit)
import UIKit
#endif

// MARK: - Color(hex:) Initializer

public extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b, a: Double
        switch hex.count {
        case 6: // #RRGGBB
            (r, g, b, a) = (
                Double((int >> 16) & 0xFF) / 255,
                Double((int >> 8) & 0xFF) / 255,
                Double(int & 0xFF) / 255,
                1
            )
        case 8: // #RRGGBBAA
            (r, g, b, a) = (
                Double((int >> 24) & 0xFF) / 255,
                Double((int >> 16) & 0xFF) / 255,
                Double((int >> 8) & 0xFF) / 255,
                Double(int & 0xFF) / 255
            )
        default:
            (r, g, b, a) = (0, 0, 0, 1)
        }
        self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}

// MARK: - UIColor(hex:) Initializer

#if canImport(UIKit)
extension UIColor {
    convenience init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b, a: CGFloat
        switch hex.count {
        case 6:
            (r, g, b, a) = (
                CGFloat((int >> 16) & 0xFF) / 255,
                CGFloat((int >> 8) & 0xFF) / 255,
                CGFloat(int & 0xFF) / 255,
                1
            )
        case 8:
            (r, g, b, a) = (
                CGFloat((int >> 24) & 0xFF) / 255,
                CGFloat((int >> 16) & 0xFF) / 255,
                CGFloat((int >> 8) & 0xFF) / 255,
                CGFloat(int & 0xFF) / 255
            )
        default:
            (r, g, b, a) = (0, 0, 0, 1)
        }
        self.init(red: r, green: g, blue: b, alpha: a)
    }
}
#endif

// MARK: - SolennixColors

public enum SolennixColors {

    // MARK: - Brand

    public static var primary: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#C4A265")
                : UIColor(hex: "#C4A265")
        })
        #else
        Color(hex: "#C4A265")
        #endif
    }

    public static var primaryDark: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#D4B87A")
                : UIColor(hex: "#B8965A")
        })
        #else
        Color(hex: "#B8965A")
        #endif
    }

    public static var primaryLight: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#1B2A4A")
                : UIColor(hex: "#F5F0E8")
        })
        #else
        Color(hex: "#F5F0E8")
        #endif
    }

    /// Navy anchor — `#1B2A4A`. Use for swipe-edit actions and other brand-navy UI
    /// that must be visually distinct from the destructive red and the gold primary.
    public static var accent: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#2D4A7A")
                : UIColor(hex: "#1B2A4A")
        })
        #else
        Color(hex: "#1B2A4A")
        #endif
    }

    public static var secondary: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#94A3B8")
                : UIColor(hex: "#6B7B8D")
        })
        #else
        Color(hex: "#6B7B8D")
        #endif
    }

    // MARK: - Surfaces

    public static var background: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#000000")
                : UIColor(hex: "#FFFFFF")
        })
        #else
        Color(hex: "#FFFFFF")
        #endif
    }

    public static var surfaceGrouped: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#070D17")
                : UIColor(hex: "#F5F4F1")
        })
        #else
        Color(hex: "#F5F4F1")
        #endif
    }

    public static var surface: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#121C2A")
                : UIColor(hex: "#FAF9F7")
        })
        #else
        Color(hex: "#FAF9F7")
        #endif
    }

    public static var surfaceAlt: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#1B2738")
                : UIColor(hex: "#F0EFEC")
        })
        #else
        Color(hex: "#F0EFEC")
        #endif
    }

    public static var card: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#1A2740")
                : UIColor(hex: "#FFFFFF")
        })
        #else
        Color(hex: "#FFFFFF")
        #endif
    }

    // MARK: - Text

    public static var text: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#F5F0E8")
                : UIColor(hex: "#1A1A1A")
        })
        #else
        Color(hex: "#1A1A1A")
        #endif
    }

    public static var textSecondary: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#9A9590")
                : UIColor(hex: "#7A7670")
        })
        #else
        Color(hex: "#7A7670")
        #endif
    }

    public static var textTertiary: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#6B6560")
                : UIColor(hex: "#A8A29E")
        })
        #else
        Color(hex: "#A8A29E")
        #endif
    }

    public static var textInverse: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#1A1A1A")
                : UIColor(hex: "#FFFFFF")
        })
        #else
        Color(hex: "#FFFFFF")
        #endif
    }

    // MARK: - Borders

    public static var border: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#2A384D")
                : UIColor(hex: "#E6E3DD")
        })
        #else
        Color(hex: "#E6E3DD")
        #endif
    }

    public static var borderStrong: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#465D7B")
                : UIColor(hex: "#D4D0C8")
        })
        #else
        Color(hex: "#D4D0C8")
        #endif
    }

    public static var separator: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(red: 84/255, green: 84/255, blue: 88/255, alpha: 0.65)
                : UIColor(red: 60/255, green: 60/255, blue: 67/255, alpha: 0.29)
        })
        #else
        Color(.sRGB, red: 60/255, green: 60/255, blue: 67/255, opacity: 0.29)
        #endif
    }

    // MARK: - Semantic

    public static var success: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#52B788")
                : UIColor(hex: "#2D6A4F")
        })
        #else
        Color(hex: "#2D6A4F")
        #endif
    }

    public static var warning: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#FF9F0A")
                : UIColor(hex: "#FF9500")
        })
        #else
        Color(hex: "#FF9500")
        #endif
    }

    public static var error: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#FF453A")
                : UIColor(hex: "#FF3B30")
        })
        #else
        Color(hex: "#FF3B30")
        #endif
    }

    public static var info: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#0A84FF")
                : UIColor(hex: "#007AFF")
        })
        #else
        Color(hex: "#007AFF")
        #endif
    }

    // MARK: - Semantic Backgrounds

    public static var successBg: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#0B1D14")
                : UIColor(hex: "#F0F7F4")
        })
        #else
        Color(hex: "#F0F7F4")
        #endif
    }

    public static var warningBg: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#2A1A00")
                : UIColor(hex: "#FFF8F0")
        })
        #else
        Color(hex: "#FFF8F0")
        #endif
    }

    public static var errorBg: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#2A0A0A")
                : UIColor(hex: "#FFF0F0")
        })
        #else
        Color(hex: "#FFF0F0")
        #endif
    }

    public static var infoBg: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#001A33")
                : UIColor(hex: "#EEF4FF")
        })
        #else
        Color(hex: "#EEF4FF")
        #endif
    }

    // MARK: - Event Status

    public static var statusQuoted: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#FBBF24")
                : UIColor(hex: "#B45309") // amber-700 — WCAG AA 4.77:1 on statusQuotedBg
        })
        #else
        Color(hex: "#B45309")
        #endif
    }

    public static var statusConfirmed: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#0A84FF")
                : UIColor(hex: "#0055CC") // WCAG AA 6.00:1 on statusConfirmedBg
        })
        #else
        Color(hex: "#0055CC")
        #endif
    }

    public static var statusCompleted: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#52B788")
                : UIColor(hex: "#2D6A4F")
        })
        #else
        Color(hex: "#2D6A4F")
        #endif
    }

    public static var statusCancelled: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#FF453A")
                : UIColor(hex: "#CC2929") // WCAG AA 4.84:1 on statusCancelledBg
        })
        #else
        Color(hex: "#CC2929")
        #endif
    }

    // MARK: - Status Backgrounds

    public static var statusQuotedBg: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#2A1A00")
                : UIColor(hex: "#FFF8F0")
        })
        #else
        Color(hex: "#FFF8F0")
        #endif
    }

    public static var statusConfirmedBg: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#001A33")
                : UIColor(hex: "#EEF4FF")
        })
        #else
        Color(hex: "#EEF4FF")
        #endif
    }

    public static var statusCompletedBg: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#0B1D14")
                : UIColor(hex: "#F0F7F4")
        })
        #else
        Color(hex: "#F0F7F4")
        #endif
    }

    public static var statusCancelledBg: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#2A0A0A")
                : UIColor(hex: "#FFF0F0")
        })
        #else
        Color(hex: "#FFF0F0")
        #endif
    }

    // MARK: - KPI

    public static var kpiGreen: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#30D158")
                : UIColor(hex: "#34C759")
        })
        #else
        Color(hex: "#34C759")
        #endif
    }

    public static var kpiGreenBg: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#0D2818")
                : UIColor(hex: "#EEFBF0")
        })
        #else
        Color(hex: "#EEFBF0")
        #endif
    }

    public static var kpiOrange: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#FBBF24")
                : UIColor(hex: "#D97706")
        })
        #else
        Color(hex: "#D97706")
        #endif
    }

    public static var kpiOrangeBg: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#2A1A00")
                : UIColor(hex: "#FFF8F0")
        })
        #else
        Color(hex: "#FFF8F0")
        #endif
    }

    public static var kpiBlue: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#0A84FF")
                : UIColor(hex: "#007AFF")
        })
        #else
        Color(hex: "#007AFF")
        #endif
    }

    public static var kpiBlueBg: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#001A33")
                : UIColor(hex: "#EEF4FF")
        })
        #else
        Color(hex: "#EEF4FF")
        #endif
    }

    // MARK: - Tab Bar

    public static var tabBarBackground: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#0A0F1A")
                : UIColor(hex: "#F5F4F1")
        })
        #else
        Color(hex: "#F5F4F1")
        #endif
    }

    public static var tabBarActive: Color {
        Color(hex: "#C4A265")
    }

    public static var tabBarInactive: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#6B6560")
                : UIColor(hex: "#A8A29E")
        })
        #else
        Color(hex: "#A8A29E")
        #endif
    }

    public static var tabBarBorder: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#252A35")
                : UIColor(hex: "#E6E3DD")
        })
        #else
        Color(hex: "#E6E3DD")
        #endif
    }

    // MARK: - Avatar Palette (tonal — brand-consistent)

    /// Background chip for initials avatars.
    /// Dark: navy chip (#1B2738) · Light: warm neutral (#F0EFEC = surfaceAlt light).
    public static var avatarBackground: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#1B2738")
                : UIColor(hex: "#F0EFEC")
        })
        #else
        Color(hex: "#F0EFEC")
        #endif
    }

    /// Initials text color — ensures ≥4.5:1 contrast against avatarBackground.
    /// Light: #7A6133 (~5.3:1 on #F0EFEC, passes AA) · Dark: #C4A265 (~5.8:1 on #1B2738).
    public static var avatarInitials: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#C4A265")
                : UIColor(hex: "#7A6133")
        })
        #else
        Color(hex: "#7A6133")
        #endif
    }

    /// Deprecated — use tonal `avatarBackground`/`avatarInitials` tokens instead.
    @available(*, deprecated, renamed: "avatarBackground", message: "Replaced by tonal avatar tokens. hashValue is per-launch unstable.")
    public static let avatarColors: [Color] = []

    // MARK: - On-Primary

    /// Fixed dark navy for text/icons placed on top of the gold premium gradient.
    ///
    /// The gradient endpoints are:
    ///   #C4A265 (start) — navy contrast ≈ 5.69:1  ✓ WCAG AA
    ///   #B8965A (end)   — navy contrast ≈ 4.93:1  ✓ WCAG AA
    ///
    /// This value is the SAME in light and dark because the gradient itself does not
    /// flip between modes — navy-on-gold is the intended premium look in both modes.
    public static var onPrimary: Color {
        Color(hex: "#1B2A4A")
    }

    // MARK: - Icon Square Palette (More Menu / muted brand-tonal)
    //
    // All tokens are tuned so a white SF Symbol glyph achieves ≥ 3:1 contrast
    // against the icon square background (WCAG 1.4.11 non-text contrast).
    // Contrast values: light mode / dark mode
    //   iconSlate:  6.87 / 4.34
    //   iconTaupe:  5.24 / 3.36
    //   iconSage:   5.86 / 3.80
    //   iconSteel:  5.47 / 3.39
    // Note: Payments uses SolennixColors.primary (gold #C4A265, 2.41:1) as a
    // deliberate brand override — gold = money is the only gold in the palette.

    /// Muted navy-blue — Products icon square.
    public static var iconSlate: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#5A7BA8")
                : UIColor(hex: "#3E5C82")
        })
        #else
        Color(hex: "#3E5C82")
        #endif
    }

    /// Muted earth-brown — Inventory icon square.
    public static var iconTaupe: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#9A8A72")
                : UIColor(hex: "#7A6A52")
        })
        #else
        Color(hex: "#7A6A52")
        #endif
    }

    /// Muted sage-green — Form Links icon square.
    public static var iconSage: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#6B8A78")
                : UIColor(hex: "#4F6B5A")
        })
        #else
        Color(hex: "#4F6B5A")
        #endif
    }

    /// Muted blue-steel — Personnel icon square.
    public static var iconSteel: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#7A8E9E")
                : UIColor(hex: "#5C6B7A")
        })
        #else
        Color(hex: "#5C6B7A")
        #endif
    }

    /// Muted graphite-plum — Reviews icon square.
    /// Contrast (white glyph): light #6B5B7B = 5.93:1 / dark #9A82B0 = 3.47:1 (both ≥ 3:1).
    public static var iconPlum: Color {
        #if canImport(UIKit)
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#9A82B0")
                : UIColor(hex: "#6B5B7B")
        })
        #else
        Color(hex: "#6B5B7B")
        #endif
    }
}
