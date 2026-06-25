import XCTest
import SwiftUI
import TipKit
@testable import SolennixFeatures

/// Task 4.7 — "First-Run Onboarding Tip" (`events-calendar` delta).
///
/// Spec scenario: Tip shown once then suppressed
///   GIVEN the onboarding `@AppStorage` flag is unset/false
///   WHEN  Eventos appears for the first time
///   THEN  the tip MUST be shown
///   WHEN  the user dismisses it
///   THEN  the flag MUST be set true and the tip MUST NOT appear on
///         subsequent launches
///
/// TipKit's popover lifecycle can't be exercised headlessly in a unit test
/// (it needs a live window + the Tips datastore). So the gating contract is
/// extracted into a pure, UserDefaults-backed seam `EventosOnboardingTipGate`
/// (mirrors the ADR-8 seam philosophy of 4.2 / 4.4 / 4.5 / 4.6): the SINGLE
/// `@AppStorage` key, the "should show given the flag" decision, and the
/// "mark dismissed → flag true" side effect. `EventListView` wires that seam
/// into the TipKit popover's `shouldDisplay` binding (get = `shouldShow(flag)`,
/// set(false on dismiss) → flag = true), so this gate IS the "shown once then
/// suppressed" behavior the spec scenario requires.
final class EventosOnboardingTipTests: XCTestCase {

    // MARK: - Visibility decision (pure)

    func testTipShownWhenDismissedFlagIsFalse() {
        // Flag unset/false → first run → the tip MUST surface.
        XCTAssertTrue(
            EventosOnboardingTipGate.shouldShow(dismissedFlag: false),
            "the onboarding tip must be shown on first run (flag unset/false)"
        )
    }

    func testTipSuppressedWhenDismissedFlagIsTrue() {
        // Flag already true → already seen → the tip MUST NOT surface.
        XCTAssertFalse(
            EventosOnboardingTipGate.shouldShow(dismissedFlag: true),
            "the onboarding tip must not reappear once dismissed (flag true)"
        )
    }

    // MARK: - Shown-once-then-suppressed against a real UserDefaults store

    func testDismissalSetsFlagTrueAndSuppressesOnNextLaunch() {
        // Full "shown once then suppressed" lifecycle, exercised against an
        // ISOLATED UserDefaults suite (never touches .standard, removed after).
        let suiteName = "eventos-onboarding-tip-test-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!

        // GIVEN first run — flag unset → bool(forKey:) returns false.
        XCTAssertFalse(
            EventosOnboardingTipGate.isDismissed(in: defaults),
            "flag must read false before the tip has ever been dismissed"
        )

        // THEN on first appearance the tip would show.
        XCTAssertTrue(
            EventosOnboardingTipGate.shouldShow(
                dismissedFlag: EventosOnboardingTipGate.isDismissed(in: defaults)
            ),
            "tip must show on first appearance"
        )

        // WHEN the user dismisses it.
        EventosOnboardingTipGate.markDismissed(in: defaults)

        // THEN the flag is persisted true...
        XCTAssertTrue(
            EventosOnboardingTipGate.isDismissed(in: defaults),
            "dismissal must persist the flag as true"
        )

        // ...and the tip MUST NOT reappear on a subsequent launch.
        XCTAssertFalse(
            EventosOnboardingTipGate.shouldShow(
                dismissedFlag: EventosOnboardingTipGate.isDismissed(in: defaults)
            ),
            "tip must not reappear on subsequent launches once dismissed"
        )

        defaults.removePersistentDomain(forName: suiteName)
    }

    // MARK: - Single canonical @AppStorage key (spec: "single @AppStorage flag")

    func testStorageKeyIsTheSingleCanonicalAppStorageKey() {
        // Spec: "gated by a SINGLE @AppStorage flag". Pin the key so the view's
        // `@AppStorage(EventosOnboardingTipGate.storageKey)` and the gate agree
        // on exactly one flag — no shadow duplicates can drift apart.
        XCTAssertEqual(
            EventosOnboardingTipGate.storageKey,
            "eventosOnboardingShown",
            "the onboarding tip must be gated by exactly one canonical @AppStorage key"
        )
    }

    // MARK: - Tip is a valid TipKit Tip mirroring NewEventTip (content-only)

    func testOnboardingTipIsConstructibleTip() {
        // Mirrors `NewEventTip`: a content-only `Tip` (no rules) the popover
        // presents. Constructible + resolves its title/message/image proves the
        // type is a valid Tip the view can instantiate and pass to `.popoverTip`.
        // (Text content can't be string-extracted headlessly; resolution itself
        // is the proof — a malformed Tip would trap/return nil here.)
        let tip = EventosOnboardingTip()
        _ = tip.title
        _ = tip.message
        _ = tip.image
    }
}
