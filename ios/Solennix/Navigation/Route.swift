import Foundation
import SolennixCore

// Route is now defined in SolennixCore so it can be shared across packages.

// MARK: - Tab

/// The four tabs shown in the compact (iPhone) tab bar.
public enum Tab: Int, Hashable, CaseIterable {
    case home
    case calendar
    case clients
    case more

    /// The SF Symbol icon name for this tab.
    public var iconName: String {
        switch self {
        case .home:     return "house.fill"
        case .calendar: return "calendar"
        case .clients:  return "person.2.fill"
        case .more:     return "ellipsis"
        }
    }

    /// The localized title for this tab.
    public var title: String {
        switch self {
        case .home:     return "Inicio"
        case .calendar: return "Calendario"
        case .clients:  return "Clientes"
        case .more:     return "Mas"
        }
    }
}

// MARK: - SidebarSection

/// Sections shown in the iPad/Mac sidebar navigation.
public enum SidebarSection: String, Hashable, CaseIterable {
    case dashboard
    case calendar
    case events
    case clients
    case products
    case inventory
    case search
    case settings

    /// The SF Symbol icon name for this sidebar section.
    public var iconName: String {
        switch self {
        case .dashboard: return "house.fill"
        case .calendar:  return "calendar"
        case .events:    return "calendar.badge.clock"
        case .clients:   return "person.2.fill"
        case .products:  return "shippingbox.fill"
        case .inventory: return "archivebox.fill"
        case .search:    return "magnifyingglass"
        case .settings:  return "gearshape.fill"
        }
    }

    /// The localized title for this sidebar section.
    public var title: String {
        switch self {
        case .dashboard: return "Inicio"
        case .calendar:  return "Calendario"
        case .events:    return "Eventos"
        case .clients:   return "Clientes"
        case .products:  return "Productos"
        case .inventory: return "Inventario"
        case .search:    return "Buscar"
        case .settings:  return "Ajustes"
        }
    }
}
