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

    /// The SF Symbol icon name for this tab.
    public var iconName: String {
        switch self {
        case .home:     return "house.fill"
        case .events:   return "party.popper.fill"
        case .clients:  return "person.2.fill"
        case .more:     return "ellipsis"
        }
    }

    /// The localized title for this tab.
    public var title: String {
        switch self {
        case .home:     return CommonStrings.tabHome
        case .events:   return CommonStrings.tabEvents
        case .clients:  return CommonStrings.tabClients
        case .more:     return CommonStrings.tabMore
        }
    }
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
