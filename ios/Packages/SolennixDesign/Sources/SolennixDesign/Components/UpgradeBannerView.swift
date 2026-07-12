import SwiftUI

// MARK: - Upgrade Banner View

public enum UpgradeBannerType {
    case limitReached
    case upsell
}

public struct UpgradeBannerView: View {

    let type: UpgradeBannerType
    let resource: String?
    let currentUsage: Int?
    let limit: Int?
    // Fix 14: callers supply the CTA label so it can be localized by the feature package.
    // `nil` resolves the default key `upgrade.banner.cta` against the app catalog; a
    // non-nil value is used verbatim (for callers that pass an already-localized label).
    let ctaLabel: String?

    public init(
        type: UpgradeBannerType,
        resource: String? = nil,
        currentUsage: Int? = nil,
        limit: Int? = nil,
        ctaLabel: String? = nil
    ) {
        self.type = type
        self.resource = resource
        self.currentUsage = currentUsage
        self.limit = limit
        self.ctaLabel = ctaLabel
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            // Header
            HStack(spacing: Spacing.xs) {
                Image(systemName: "bolt.fill")
                    .font(.subheadline)
                    .foregroundStyle(iconColor)

                Text(title)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(iconColor)
            }

            // Description
            Text(description)
                .font(.footnote)
                .foregroundStyle(SolennixColors.textSecondary)

            // CTA label — non-interactive; navigation is owned by the caller's NavigationLink wrapper.
            Text(ctaLabel != nil ? LocalizedStringKey(ctaLabel!) : LocalizedStringKey("upgrade.banner.cta"))
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(.white)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.xs)
                .background(buttonColor)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                .padding(.top, Spacing.xs)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(backgroundColor)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
    }

    // MARK: - Computed Properties

    private var isLimitReached: Bool {
        type == .limitReached
    }

    /// Resolves a key against the app's `Localizable` catalog.
    /// `SolennixDesign` is an SPM package without its own catalog, so — like
    /// `ViewModifiers.swift`'s `LocalizedStringKey` usage — strings resolve
    /// against the host app bundle at runtime. Manual lookup (instead of
    /// `LocalizedStringKey`) keeps the conditional/interpolated title and
    /// description clean without positional-format key gymnastics.
    private static func l10n(_ key: String, _ defaultValue: String) -> String {
        Bundle.main.localizedString(forKey: key, value: defaultValue, table: "Localizable")
    }

    private var title: String {
        if isLimitReached {
            let base = Self.l10n("upgrade.banner.limit_title", "Limit reached")
            if let resource, !resource.isEmpty {
                return "\(base) (\(resource))"
            }
            return base
        } else {
            return Self.l10n("upgrade.banner.upsell_title", "Unlock more with Pro")
        }
    }

    private var description: String {
        if isLimitReached {
            // Single template so translators control word order: "You've used %1$@ of %2$@. Upgrade your plan to continue."
            let usageStr = currentUsage.map { "\($0)" } ?? "?"
            let limitStr = limit.map { "\($0)" } ?? "?"
            let template = Self.l10n("upgrade.banner.limit_desc", "You've used %@ of %@. Upgrade your plan to continue.")
            return String(format: template, usageStr, limitStr)
        } else {
            return Self.l10n("upgrade.banner.upsell_desc", "Get unlimited events, more clients, and all features.")
        }
    }

    private var backgroundColor: Color {
        isLimitReached ? SolennixColors.warningBg : SolennixColors.infoBg
    }

    private var iconColor: Color {
        isLimitReached ? SolennixColors.warning : SolennixColors.info
    }

    private var buttonColor: Color {
        isLimitReached ? SolennixColors.warning : SolennixColors.primary
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: Spacing.md) {
        UpgradeBannerView(
            type: .upsell
        )

        UpgradeBannerView(
            type: .limitReached,
            resource: "Events",
            currentUsage: 5,
            limit: 5
        )
    }
    .padding()
    .background(SolennixColors.background)
}
