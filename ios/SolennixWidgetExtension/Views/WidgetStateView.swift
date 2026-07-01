import SwiftUI
import WidgetKit
import SolennixDesign

// MARK: - WidgetStateView

/// Shared four-state widget surface adopted by **every** widget family
/// (REQ-WP-01 / decision #3135).
///
/// Renders `placeholder`, `empty`, `signedOut`, and `error` consistently using
/// SolennixDesign adaptive color tokens so the surface respects light/dark
/// mode — it is never a raw `Color(.systemBackground)` fill. The core user
/// complaint ("a background-colored rectangle") came from widgets rendering an
/// empty data branch with no content; this component guarantees every family
/// shows a recognizable, themed state instead (REQ-WP-04).
///
/// Each adopting family wraps its real content in the same
/// `.containerBackground(.fill.tertiary, for: .widget)` chrome, so this view
/// applies it too to keep the surface visually consistent across states.
struct WidgetStateView: View {

    /// The four states every widget family MUST handle (REQ-WP-01).
    enum State: Equatable {
        /// Loading skeleton — rendered with `.redacted(reason: .placeholder)`.
        case placeholder
        /// Authenticated user with no data yet.
        case empty
        /// Unauthenticated — the user must sign in (signal from PR1's
        /// `WidgetAuthState.current`).
        case signedOut
        /// Data exists but could not be decoded (corrupt payload).
        case error
    }

    private let state: State
    private let titleKey: LocalizedStringKey?
    private let systemImage: String?
    private let compact: Bool

    /// - Parameters:
    ///   - state: The presentation state to render.
    ///   - titleKey: Optional override for the message text. Defaults to a
    ///     state-appropriate localized string.
    ///   - systemImage: Optional SF Symbol override. Defaults per state.
    ///   - compact: When `true`, renders an icon-only layout for tight surfaces
    ///     (e.g. Lock Screen accessories) where a title would not fit.
    init(
        state: State,
        titleKey: LocalizedStringKey? = nil,
        systemImage: String? = nil,
        compact: Bool = false
    ) {
        self.state = state
        self.titleKey = titleKey
        self.systemImage = systemImage
        self.compact = compact
    }

    var body: some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .containerBackground(.fill.tertiary, for: .widget)
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        switch state {
        case .placeholder:
            // REQ-WP-01: placeholder uses the standard SwiftUI redaction so the
            // system renders a proper loading skeleton, not a blank pane.
            placeholderContent
                .redacted(reason: .placeholder)
        case .empty, .signedOut, .error:
            messageContent
        }
    }

    /// A lightweight skeleton that redacts into a shimmer-free placeholder.
    private var placeholderContent: some View {
        VStack(alignment: .leading, spacing: compact ? 4 : 8) {
            Capsule()
                .fill(SolennixColors.surfaceAlt)
                .frame(width: compact ? 28 : 54, height: compact ? 8 : 12)
            Capsule()
                .fill(SolennixColors.surfaceAlt)
                .frame(maxWidth: .infinity)
                .frame(height: compact ? 6 : 10)
            Capsule()
                .fill(SolennixColors.surfaceAlt)
                .frame(width: compact ? 40 : 90, height: compact ? 6 : 10)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(compact ? 8 : 16)
    }

    /// Icon (+ optional title) for `empty`, `signedOut`, and `error`.
    private var messageContent: some View {
        VStack(spacing: compact ? 4 : 8) {
            Image(systemName: resolvedIcon)
                .font(.system(size: compact ? 18 : 30, weight: .regular))
                .foregroundStyle(resolvedTint)

            if !compact {
                Text(titleKey ?? defaultTitleKey)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
            }
        }
        .padding(compact ? 8 : 16)
    }

    // MARK: - Resolved values

    private var resolvedIcon: String {
        Self.icon(for: state, override: systemImage)
    }

    /// SF Symbol for a state, honoring an adopter override. Internal so the
    /// mapping is unit-testable without inspecting the view tree.
    internal static func icon(for state: State, override: String? = nil) -> String {
        if let override { return override }
        switch state {
        case .placeholder: return "ellipsis"
        case .empty: return "tray"
        case .signedOut: return "person.crop.circle.badge.exclamationmark"
        case .error: return "exclamationmark.triangle.fill"
        }
    }

    private var resolvedTint: Color {
        switch state {
        case .signedOut: return SolennixColors.warning
        case .error: return SolennixColors.error
        case .placeholder, .empty: return SolennixColors.textSecondary
        }
    }

    private var defaultTitleKey: LocalizedStringKey {
        switch state {
        case .placeholder: return "widget.state.empty.title"
        case .empty: return "widget.state.empty.title"
        case .signedOut: return "widget.state.signedout.title"
        case .error: return "widget.state.error.title"
        }
    }
}
