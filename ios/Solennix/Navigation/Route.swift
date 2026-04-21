import Foundation
import SolennixCore

// Route is now defined in SolennixCore so it can be shared across packages.

// MARK: - Tab

/// The five tabs shown in the compact (iPhone) tab bar.
public enum Tab: Int, Hashable, CaseIterable {
    case home
    case calendar
    case events
    case clients
    case more

    /// The SF Symbol icon name for this tab.
    public var iconName: String {
        switch self {
        case .home:     return "house.fill"
        case .calendar: return "calendar"
        case .events:   return "party.popper.fill"
        case .clients:  return "person.2.fill"
        case .more:     return "ellipsis"
        }
    }

    /// The localized title for this tab.
    public var title: String {
        switch self {
        case .home:     return "Inicio"
        case .calendar: return "Calendario"
        case .events:   return "Eventos"
        case .clients:  return "Clientes"
        case .more:     return "Más"
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
    case personnel
    case products
    case inventory
    case eventFormLinks
    case settings

    /// The SF Symbol icon name for this sidebar section.
    public var iconName: String {
        switch self {
        case .dashboard:       return "house.fill"
        case .calendar:        return "calendar"
        case .events:          return "party.popper.fill"
        case .clients:         return "person.2.fill"
        case .personnel:       return "person.3.fill"
        case .products:        return "shippingbox.fill"
        case .inventory:       return "archivebox.fill"
        case .eventFormLinks:  return "link"
        case .settings:        return "gearshape.fill"
        }
    }

    /// The localized title for this sidebar section.
    public var title: String {
        switch self {
        case .dashboard:       return "Inicio"
        case .calendar:        return "Calendario"
        case .events:          return "Eventos"
        case .clients:         return "Clientes"
        case .personnel:       return "Personal"
        case .products:        return "Productos"
        case .inventory:       return "Inventario"
        case .eventFormLinks:  return "Formularios"
        case .settings:        return "Ajustes"
        }
    }
}
