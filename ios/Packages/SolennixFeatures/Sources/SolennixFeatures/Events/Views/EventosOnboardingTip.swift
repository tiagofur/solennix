import SwiftUI
import TipKit

// MARK: - EventosOnboardingTip (task 4.7, ADR-8 content-only Tip)

/// First-run onboarding tip explaining that the Calendar tab now lives inside
/// Eventos (the `Lista | Calendario` toggle).
///
/// Spec "First-Run Onboarding Tip" (`events-calendar` delta): a one-shot tip
/// shown the first time the unified Eventos screen appears, suppressed forever
/// once the user dismisses it. Visibility is gated by the SINGLE
/// `@AppStorage` flag owned by `EventosOnboardingTipGate` — this `Tip` itself
/// is content-only (mirrors the existing `NewEventTip`: no `rules`, just
/// title/message/image). `EventosOnboardingTipPresenter` attaches the popover
/// gated by that flag and persists it true on dismiss.
public struct EventosOnboardingTip: Tip {
    public var title: Text {
        Text(CommonStrings.eventosOnboardingTipTitle)
    }

    public var message: Text? {
        Text(CommonStrings.eventosOnboardingTipMessage)
    }

    public var image: Image? {
        Image(systemName: "calendar.badge.clock")
    }

    public init() {}
}

// MARK: - EventosOnboardingTipGate (task 4.7, ADR-8 gating seam)

/// The pure, UserDefaults-backed gate that decides whether
/// `EventosOnboardingTip` surfaces.
///
/// TipKit's popover lifecycle cannot be exercised headlessly in a unit test
/// (it needs a live window + the Tips datastore). So the spec's "shown once
/// then suppressed" contract is extracted here — the SINGLE canonical
/// `@AppStorage` key, the should-show decision, and the dismiss side effect —
/// exactly mirroring the ADR-8 seam philosophy of 4.2 / 4.4 / 4.5 / 4.6 (named,
/// stateless, testable-in-isolation surfaces). `EventosOnboardingTipPresenter`
/// wires this gate into the popover: it attaches `.popoverTip` only while the
/// flag is false, and persists the flag true the moment TipKit reports the tip
/// invalidated (`.tipClosed` / `.actionPerformed`).
///
/// Spec requirement: "gated by a single `@AppStorage` flag that is set true
/// after dismissal" — `storageKey` is the ONE place that key lives.
public enum EventosOnboardingTipGate {

    /// The single `@AppStorage` flag gating the tip. `EventListView` MUST read
    /// its popover binding through this same key so the gate and the view can
    /// never drift apart on two different keys.
    public static let storageKey = "eventosOnboardingShown"

    /// Whether the tip should surface given the persisted dismissal flag.
    /// The only decision "shown once then suppressed" needs: show while the
    /// user has never dismissed it, suppress forever after.
    public static func shouldShow(dismissedFlag: Bool) -> Bool {
        !dismissedFlag
    }

    /// Read the persisted dismissal flag from the given store. `UserDefaults`
    /// returns `false` for an unset key, so this is `false` until the user has
    /// dismissed the tip at least once (i.e. first run = not dismissed = show).
    public static func isDismissed(in defaults: UserDefaults = .standard) -> Bool {
        defaults.bool(forKey: storageKey)
    }

    /// Mark the tip as dismissed: write the flag `true`. TipKit invalidates the
    /// popover's status (`.tipClosed` when the user taps the close button, or
    /// `.actionPerformed` when they tap the tip's action); the presenter maps
    /// either invalidation to this call (persisting `true`). Writes ONLY the
    /// single canonical key.
    public static func markDismissed(in defaults: UserDefaults = .standard) {
        defaults.set(true, forKey: storageKey)
    }
}

// MARK: - EventosOnboardingTipPresenter (task 4.7, cross-version wiring)

/// Presents `EventosOnboardingTip` on its anchor so the tip shows exactly once,
/// mirroring the spec's "gated by a single `@AppStorage` flag that is set true
/// after dismissal".
///
/// Two responsibilities, both uniform across iOS 17+ (no version split):
///   1. ATTACH GATE — the popover is attached ONLY while the flag is false.
///      Once the flag is true, the popover is never attached again, so the tip
///      cannot reappear on a subsequent launch regardless of TipKit's own
///      display frequency. The `@AppStorage` flag is the SOLE gate (spec).
///   2. DISMISS HOOK — observe TipKit's `statusUpdates`. When the user closes
///      the tip (`.tipClosed`) or taps its action (`.actionPerformed`), TipKit
///      invalidates the status; the presenter then persists the flag `true`,
///      which re-renders the anchor without the popover. This is dismiss-based
///      (spec-literal) and is the same invalidation hook TipKit exposes on
///      every iOS version since 17.0.
///
/// `EventListView` anchors this on the `Lista | Calendario` toggle (the
/// affordance the tip explains).
struct EventosOnboardingTipPresenter: ViewModifier {

    let tip: EventosOnboardingTip
    @Binding var shown: Bool

    func body(content: Content) -> some View {
        if shown {
            // Flag already true → already seen → never attach the popover.
            content
        } else {
            content
                .popoverTip(tip)
                .task {
                    // Persist the flag the moment TipKit reports the tip
                    // invalidated (closed by the user or via an action). That
                    // makes the popover's next render omit the modifier, so the
                    // tip can't reappear on a later launch.
                    for await status in tip.statusUpdates {
                        if case .invalidated = status {
                            shown = true
                            return
                        }
                    }
                }
        }
    }
}

extension View {
    /// Presents the first-run `EventosOnboardingTip` gated by `shown` (the
    /// single `@AppStorage("eventosOnboardingShown")` flag). See
    /// `EventosOnboardingTipPresenter`.
    func eventosOnboardingTip(_ tip: EventosOnboardingTip, shown: Binding<Bool>) -> some View {
        modifier(EventosOnboardingTipPresenter(tip: tip, shown: shown))
    }
}
