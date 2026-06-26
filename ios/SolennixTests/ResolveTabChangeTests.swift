import XCTest
@testable import Solennix

/// Pure selection-reducer contract tests (bottom-nav-search, PR1 task 1.2).
///
/// `resolveTabChange(current:next:)` extracts the tab-switch decision out of the
/// `ios26TabSelection` / `legacyTabSelection` bindings so that:
///  - re-tapping the active tab pops it to root (reset that tab's path), AND
///  - any transition involving `.search` (entering or leaving) PRESERVES the
///    leaving tab's navigation stack (so the system's dismiss-restore reshows
///    the prior detail), AND
///  - a regular-tab → different-regular-tab switch keeps today's behavior: the
///    leaving tab's path is reset (minimal blast radius, user-blessed scope).
///
/// These are pure-function tests — no SwiftUI — satisfying strict TDD for the
/// decision logic that CAN be automated (see design Decision 4).
final class ResolveTabChangeTests: XCTestCase {

    // MARK: - Re-tap → reset that tab (pop to root)

    func testReTapEventsResetsEvents() {
        // events → events: same-tab re-tap MUST signal a reset of `events`.
        let effect = resolveTabChange(current: .events, next: .events)
        XCTAssertEqual(effect.resetTab, .events)
    }

    func testReTapSearchResetsSearch() {
        // Triangulation: the re-tap rule applies to the search tab too.
        let effect = resolveTabChange(current: .search, next: .search)
        XCTAssertEqual(effect.resetTab, .search)
    }

    // MARK: - Entering search → preserve leaving tab's nav stack

    func testEnteringSearchFromEventsPreservesEventsPath() {
        // events → search: entering search MUST NOT reset `events` so the system
        // dismiss-restore can reshow the prior Events detail (spec: "Dismiss
        // restores previous tab and nav state").
        let effect = resolveTabChange(current: .events, next: .search)
        XCTAssertNil(effect.resetTab)
    }

    // MARK: - Leaving search → preserve nav stack

    func testLeavingSearchToEventsPreservesPath() {
        // search → events: leaving search MUST NOT reset anything (restore path
        // intact; re-tap edge case covered separately by the manual checklist).
        let effect = resolveTabChange(current: .search, next: .events)
        XCTAssertNil(effect.resetTab)
    }

    // MARK: - Regular → different regular → reset leaving tab (unchanged UX)

    func testEventsToClientsResetsEvents() {
        // events → clients: a regular-to-regular switch keeps the existing
        // behavior — the leaving tab's path is reset.
        let effect = resolveTabChange(current: .events, next: .clients)
        XCTAssertEqual(effect.resetTab, .events)
    }

    func testClientsToHomeResetsClients() {
        // Triangulation: a second regular→regular pair exercises the same branch
        // with different operands (guards against a hardcoded single-case Fake It).
        let effect = resolveTabChange(current: .clients, next: .home)
        XCTAssertEqual(effect.resetTab, .clients)
    }
}
