import Foundation
import SolennixCore
import SolennixFeatures

// Route is now defined in SolennixCore so it can be shared across packages.

// MARK: - Tab

/// The tabs shown in the compact (iPhone) tab bar.
public enum Tab: Int, Hashable, CaseIterable {
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
public enum SidebarSection: String, Hashable, CaseIterable {
    case dashboard
    case events
    case clients
    case personnel
    case products
    case inventory
    case paymentInbox
    case eventFormLinks
    case reviews
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
        case .eventFormLinks:  return "link"
        case .reviews:         return "star.fill"
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
        case .eventFormLinks:  return CommonStrings.navEventFormLinks
        case .reviews:         return CommonStrings.navReviews
        case .settings:        return CommonStrings.navSettings
        }
    }
}

// MARK: - SidebarSection Navigation Metadata

extension SidebarSection {
    /// Main sidebar order for iPad/macOS.
    static let mainSections: [SidebarSection] = [
        .dashboard, .events, .clients, .personnel, .products, .inventory, .paymentInbox, .eventFormLinks, .reviews
    ]

    /// Catalog section order for the iPhone "Mas" menu.
    static let moreMenuCatalogSections: [SidebarSection] = [
        .products, .inventory, .paymentInbox, .personnel, .eventFormLinks, .reviews
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
        case .eventFormLinks:
            return .eventFormLinks
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
        switch self {
        case .eventFormLinks:  return "link.circle.fill"
        default:               return iconName
        }
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
        case .eventFormLinks:
            return CommonStrings.moreMenuEventFormLinksSubtitle
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
