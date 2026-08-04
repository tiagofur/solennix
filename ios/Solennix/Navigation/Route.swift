import Foundation
import SwiftUI
import SolennixCore
import SolennixFeatures

// Route is now defined in SolennixCore so it can be shared across packages.

// MARK: - Tab

/// The tabs shown in the compact (iPhone) tab bar.
///
/// `Codable` so the selected tab can be persisted to `@SceneStorage` via an
/// epoch-stamped `NavPersistedValue<Tab>` envelope for relaunch state
/// restoration (ios-lifecycle PR-B). Auto-synthesized (Int raw value).
public enum Tab: Int, Hashable, CaseIterable, Codable {
    case home
    case events
    case clients
    case more
    case search

    /// The SF Symbol icon name for this tab.
    public var iconName: String {
        switch self {
        case .home:     return "house.fill"
        case .events:   return "party.popper.fill"
        case .clients:  return "person.2.fill"
        case .more:     return "ellipsis"
        case .search:   return "magnifyingglass"
        }
    }

    /// The localized title for this tab.
    public var title: String {
        switch self {
        case .home:     return CommonStrings.tabHome
        case .events:   return CommonStrings.tabEvents
        case .clients:  return CommonStrings.tabClients
        case .more:     return CommonStrings.tabMore
        case .search:   return CommonStrings.tabSearch
        }
    }
}

// MARK: - Tab Selection Reducer

/// The effect of a tab-bar selection change, computed purely from the
/// `(current, next)` tab pair.
///
/// `resetTab == nil`  → preserve the leaving tab's navigation stack.
/// `resetTab != nil`  → reset that tab's `NavigationPath` (pop to root).
struct TabSelectionEffect {
    var resetTab: Tab?
}

/// Pure selection decision shared by the `ios26TabSelection` and
/// `legacyTabSelection` bindings (design Decision 4).
///
/// - Re-tap (`current == next`): reset that tab → pop to root.
/// - Any transition involving `.search` (entering or leaving): preserve both
///   stacks so the system's dismiss-restore reshows the prior detail
///   (spec: "Dismiss restores previous tab and nav state").
/// - Regular → different regular tab: reset the leaving tab (unchanged UX,
///   minimal blast radius).
func resolveTabChange(current: Tab, next: Tab) -> TabSelectionEffect {
    if current == next { return .init(resetTab: next) }
    if next == .search || current == .search { return .init(resetTab: nil) }
    return .init(resetTab: current)
}

// MARK: - Clear-on-Exit Decision

/// Pure decision for PR2 task 2.4: should the search query be cleared when the
/// tab bar transitions from `current` to `next`?
///
/// Clears ONLY when LEAVING the `.search` tab (`current == .search` and
/// `next != .search`). Entering search, re-tapping search, and regular-tab
/// switches do not clear (spec R7: "Text MUST clear on tab exit" — i.e. on the
/// exit transition only). `CompactTabLayout` wires this onto
/// `.onChange(of: selectedTab)` → `SearchViewModel.clearSearch()`.
///
/// Extracted as a pure function so the leave-decision is unit-testable
/// (`ClearOnExitTests`); the visual clear is verified by the manual checklist.
func shouldClearSearchOnTabExit(current: Tab, next: Tab) -> Bool {
    current == .search && next != .search
}

// MARK: - Spotlight Transition Plan (F-1)

/// The tab-transition effect a Spotlight deep-link should produce. Pure so the
/// clear-on-exit decision is unit-testable (`SpotlightClearOnExitTests`) without
/// a live Spotlight harness.
struct SpotlightNavigationPlan {
    /// The tab the Spotlight route should land on.
    var destinationTab: Tab
    /// Whether the search query must be cleared because the transition leaves
    /// the `.search` tab (spec R7). F-1: the Spotlight handlers previously set
    /// `selectedTab` directly, bypassing the `applyTabSelection` clear-on-exit
    /// chokepoint — this plan routes them back through that leave-decision.
    var clearSearchOnExit: Bool
}

/// PR3 F-1 — computes the tab-transition plan for a Spotlight deep-link landing
/// on `destinationTab` from `currentTab`. The clear-on-exit decision reuses the
/// SAME leave-decision as user tab taps (`shouldClearSearchOnTabExit`) so a
/// search query held on the search tab is never left stale when Spotlight
/// navigates away (spec R7). Path handling is left to the caller — Spotlight
/// always resets `homePath` and pushes the route, which this plan does NOT
/// change (preserves the existing Spotlight → home → push behavior).
func planSpotlightTransition(from currentTab: Tab, to destinationTab: Tab) -> SpotlightNavigationPlan {
    SpotlightNavigationPlan(
        destinationTab: destinationTab,
        clearSearchOnExit: shouldClearSearchOnTabExit(current: currentTab, next: destinationTab)
    )
}

// MARK: - SidebarSection

/// Sections shown in the iPad/Mac sidebar navigation.
///
/// `Codable` so the selected section can be persisted to `@SceneStorage` via an
/// epoch-stamped `NavPersistedValue<SidebarSection?>` envelope for relaunch
/// state restoration (ios-lifecycle PR-B). Auto-synthesized (String raw value).
public enum SidebarSection: String, Hashable, CaseIterable, Codable {
    case dashboard
    case events
    case clients
    case personnel
    case products
    case inventory
    case paymentInbox
    case reviews
    case publicRequests
    case settings

    /// The SF Symbol icon name for this sidebar section.
    public var iconName: String {
        switch self {
        case .dashboard:       return "house.fill"
        case .events:          return "party.popper.fill"
        case .clients:         return "person.2.fill"
        case .personnel:       return "person.3.fill"
        case .products:        return "shippingbox.fill"
        case .inventory:       return "archivebox.fill"
        case .paymentInbox:    return "wallet.pass.fill"
        case .reviews:         return "star.fill"
        case .publicRequests:  return "tray.and.arrow.down.fill"
        case .settings:        return "gearshape.fill"
        }
    }

    /// The localized title for this sidebar section.
    public var title: String {
        switch self {
        case .dashboard:       return CommonStrings.tabHome
        case .events:          return CommonStrings.tabEvents
        case .clients:         return CommonStrings.tabClients
        case .personnel:       return CommonStrings.navPersonnel
        case .products:        return CommonStrings.navProducts
        case .inventory:       return CommonStrings.navInventory
        case .paymentInbox:    return CommonStrings.navPaymentInbox
        case .reviews:         return CommonStrings.navReviews
        case .publicRequests:  return CommonStrings.navPublicRequests
        case .settings:        return CommonStrings.navSettings
        }
    }
}

// MARK: - SidebarSection Navigation Metadata

extension SidebarSection {
    /// Main sidebar order for iPad/macOS.
    static let mainSections: [SidebarSection] = [
        .dashboard, .events, .clients, .personnel, .products, .inventory,
        .paymentInbox, .publicRequests, .reviews
    ]

    /// Catalog section order for the iPhone "Mas" menu.
    static let moreMenuCatalogSections: [SidebarSection] = [
        .products, .inventory, .paymentInbox, .publicRequests, .personnel, .reviews
    ]

    /// Canonical route destination used by menu navigation.
    /// Sections that are root tabs (dashboard/calendar/events/clients)
    /// are handled by layout selection and do not have a Route case.
    var route: Route? {
        switch self {
        case .dashboard:
            return nil
        case .events:
            return nil
        case .clients:
            return nil
        case .personnel:
            return .staffList
        case .products:
            return .productList
        case .inventory:
            return .inventoryList
        case .paymentInbox:
            return .paymentInbox
        case .publicRequests:
            return .publicRequests
        case .reviews:
            return .reviews
        case .settings:
            return .settings
        }
    }

    /// SF Symbol icon name used specifically in the iPhone "Más" menu icon squares.
    /// Overrides `iconName` where the fill/variant differs from the sidebar baseline.
    /// The sidebar applies `.symbolVariant(.fill)` dynamically on active state, so it
    /// keeps the plain base name; the More menu always renders the filled variant.
    var moreMenuIconName: String {
        iconName
    }

    /// Secondary text used by the iPhone "Mas" list rows.
    var moreMenuSubtitle: String {
        switch self {
        case .products:
            return CommonStrings.moreMenuProductsSubtitle
        case .inventory:
            return CommonStrings.moreMenuInventorySubtitle
        case .paymentInbox:
            return CommonStrings.moreMenuPaymentInboxSubtitle
        case .publicRequests:
            return CommonStrings.moreMenuPublicRequestsSubtitle
        case .personnel:
            return CommonStrings.moreMenuPersonnelSubtitle
        case .reviews:
            return CommonStrings.moreMenuReviewsSubtitle
        case .settings:
            return CommonStrings.moreMenuSettingsSubtitle
        case .dashboard, .events, .clients:
            return ""
        }
    }
}

// MARK: - Navigation SceneStorage Restoration (ios-lifecycle PR-B)
//
// State-restoration plumbing shared by `CompactTabLayout` (B2) and
// `SidebarSplitLayout` (B3). Navigation state is persisted to `@SceneStorage`
// as JSON-encoded `Data` so it survives relaunch, and stamped with a session
// epoch so that state left behind by a logged-out user is deterministically
// discarded on the next user's launch (B4 security invariant).

/// `@SceneStorage` keys that hold per-user navigation state across relaunches.
enum NavSceneStorage {
    static let selectedTab     = "nav.selectedTab"
    static let homePath        = "nav.homePath"
    static let eventsPath      = "nav.eventsPath"
    static let clientsPath     = "nav.clientsPath"
    static let morePath        = "nav.morePath"
    static let searchPath      = "nav.searchPath"
    static let selectedSection = "nav.selectedSection"
    static let contentPath     = "nav.contentPath"

    /// Every per-user navigation SceneStorage key. `performSessionCleanup` clears
    /// these best-effort on logout; the deterministic guard, however, is the
    /// session epoch (see `NavSession`) stamped into every persisted envelope.
    static let allKeys: [String] = [
        selectedTab, homePath, eventsPath, clientsPath, morePath, searchPath,
        selectedSection, contentPath
    ]
}

/// The session-identity epoch, stored via `@AppStorage` (backed by
/// `UserDefaults.standard`, whose keys are NOT scene-mangled, so it is reliably
/// writable from `performSessionCleanup`).
///
/// `performSessionCleanup` increments this on every logout / account deletion.
/// The nav layouts stamp the current epoch into every persisted navigation
/// value; on restore, an envelope whose epoch differs from the current one is
/// discarded. This is the deterministic logout-clear signal: it survives view
/// teardown and does not depend on SceneStorage key mangling, which has no
/// reliable public API to clear from outside the owning view.
enum NavSession {
    static let resetEpoch = "session.resetEpoch"
}

/// Pure decision used by every restoration modifier: a persisted value may be
/// restored ONLY if it was stamped with the current session epoch. Extracted as
/// a free function so the security invariant is unit-testable without a view.
enum NavPersistence {
    static func shouldRestore(persistedEpoch: Int, currentEpoch: Int) -> Bool {
        persistedEpoch == currentEpoch
    }
}

/// Epoch-stamped container for a persisted `NavigationPath`. Codable so it can be
/// JSON-encoded into a `@SceneStorage(Data?)`.
struct PersistedPathEnvelope: Codable {
    let epoch: Int
    let representation: NavigationPath.CodableRepresentation
}

/// Epoch-stamped container for any persisted Codable navigation value
/// (e.g. `Tab`, `SidebarSection?`).
struct NavPersistedValue<C: Codable>: Codable {
    let epoch: Int
    let value: C
}

// MARK: - Restoration Modifiers

/// Restores a `NavigationPath` from epoch-stamped `@SceneStorage(Data?)` on first
/// appear, and persists it back on every change. Discards state whose epoch does
/// not match the current session (logout-clear invariant, B4).
private struct PersistableNavigationPathModifier: ViewModifier {
    @Binding var path: NavigationPath
    @Binding var data: Data?
    @AppStorage(NavSession.resetEpoch) private var sessionEpoch: Int = 0
    @State private var didRestore = false

    func body(content: Content) -> some View {
        content
            .onAppear(perform: restore)
            .onChange(of: path) { _, newValue in persist(newValue) }
    }

    private func restore() {
        guard !didRestore else { return }
        didRestore = true
        guard path.isEmpty, let data else { return }
        guard let envelope = try? JSONDecoder().decode(PersistedPathEnvelope.self, from: data) else { return }
        // Security guard: never restore navigation persisted under a previous
        // (logged-out) session — that would land a new user on the prior user's
        // restored nav. The epoch advances on every logout.
        guard NavPersistence.shouldRestore(persistedEpoch: envelope.epoch, currentEpoch: sessionEpoch) else { return }
        path = NavigationPath(envelope.representation)
    }

    private func persist(_ newValue: NavigationPath) {
        guard let representation = newValue.codable else {
            data = nil
            return
        }
        let envelope = PersistedPathEnvelope(epoch: sessionEpoch, representation: representation)
        data = try? JSONEncoder().encode(envelope)
    }
}

/// Restores an arbitrary Codable & Equatable value from epoch-stamped
/// `@SceneStorage(Data?)` — mirrors `PersistableNavigationPathModifier` for
/// scalars such as `Tab` / `SidebarSection?`.
private struct PersistableValueModifier<T: Codable & Equatable>: ViewModifier {
    @Binding var value: T
    @Binding var data: Data?
    @AppStorage(NavSession.resetEpoch) private var sessionEpoch: Int = 0
    @State private var didRestore = false

    func body(content: Content) -> some View {
        content
            .onAppear(perform: restore)
            .onChange(of: value) { _, newValue in persist(newValue) }
    }

    private func restore() {
        guard !didRestore else { return }
        didRestore = true
        guard let data, let envelope = try? JSONDecoder().decode(NavPersistedValue<T>.self, from: data) else { return }
        guard NavPersistence.shouldRestore(persistedEpoch: envelope.epoch, currentEpoch: sessionEpoch) else { return }
        value = envelope.value
    }

    private func persist(_ newValue: T) {
        let envelope = NavPersistedValue(epoch: sessionEpoch, value: newValue)
        data = try? JSONEncoder().encode(envelope)
    }
}

extension View {
    /// Persists `path` to `@SceneStorage(Data?)` (epoch-stamped) and restores it
    /// on first appear. See `PersistableNavigationPathModifier`.
    func persistableNavigationPath(path: Binding<NavigationPath>, data: Binding<Data?>) -> some View {
        modifier(PersistableNavigationPathModifier(path: path, data: data))
    }

    /// Persists `value` to `@SceneStorage(Data?)` (epoch-stamped) and restores it
    /// on first appear. See `PersistableValueModifier`.
    func persistable<T: Codable & Equatable>(_ value: Binding<T>, data: Binding<Data?>) -> some View {
        modifier(PersistableValueModifier<T>(value: value, data: data))
    }
}
