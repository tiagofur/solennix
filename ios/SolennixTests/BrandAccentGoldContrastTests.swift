import XCTest

// MARK: - Brand Accent Gold WCAG AA Contrast Tests
//
// sprint5-color-unification (PR2 / token core, Issue #690):
// AccentColor + `info` token light appearance were repointed to brand gold #7A5C14
// (ios/Solennix/Assets.xcassets/AccentColor.colorset + Colors.swift `info`). Because
// that gold now drives interactive controls (links, disclosure indicators, info icons)
// across light surfaces, it MUST clear WCAG AA 4.5:1 for normal text.
//
// This is the one deterministic test for the change. Resolving SolennixColors.info /
// AccentColor in-process would require UITraitCollection manipulation, so we assert
// directly on the hex value the token now uses — pure WCAG math, no UIKit traits.

final class BrandAccentGoldContrastTests: XCTestCase {

    // New light-appearance brand gold (AccentColor + `info` token light).
    private static let brandGoldLight = "#7A5C14"

    // Light surfaces the gold renders on (Colors.swift surface tokens).
    private static let lightSurfaces = ["#FFFFFF", "#FAF9F7", "#F5F4F1"]

    func testBrandAccentGoldMeetsWCAGAAOnAllLightSurfaces() {
        for surface in Self.lightSurfaces {
            let ratio = Self.contrastRatio(foreground: Self.brandGoldLight, background: surface)
            XCTAssertGreaterThanOrEqual(
                ratio,
                4.5,
                "Brand gold \(Self.brandGoldLight) on surface \(surface) is \(ratio):1 — below WCAG AA 4.5:1"
            )
        }
    }

    // MARK: - WCAG 2.1 contrast math

    private static func contrastRatio(foreground: String, background: String) -> Double {
        let l1 = relativeLuminance(hex: foreground)
        let l2 = relativeLuminance(hex: background)
        let lighter = max(l1, l2)
        let darker = min(l1, l2)
        return (lighter + 0.05) / (darker + 0.05)
    }

    private static func relativeLuminance(hex: String) -> Double {
        let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8) & 0xFF) / 255
        let b = Double(int & 0xFF) / 255
        func channel(_ c: Double) -> Double {
            c <= 0.03928 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }
}
