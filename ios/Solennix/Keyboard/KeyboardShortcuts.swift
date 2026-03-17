import SwiftUI

// MARK: - Keyboard Shortcuts

/// Global keyboard shortcuts for iPad and Mac
struct KeyboardShortcutModifier: ViewModifier {

    @Environment(\.openURL) private var openURL

    // Navigation callbacks
    var onNewEvent: (() -> Void)?
    var onSearch: (() -> Void)?
    var onGoToDashboard: (() -> Void)?
    var onGoToCalendar: (() -> Void)?
    var onGoToClients: (() -> Void)?
    var onGoToProducts: (() -> Void)?
    var onGoToInventory: (() -> Void)?
    var onGoToSettings: (() -> Void)?
    var onRefresh: (() -> Void)?

    func body(content: Content) -> some View {
        content
            .keyboardShortcut(.init("n"), modifiers: .command) // New event
            .keyboardShortcut(.init("f"), modifiers: .command) // Search
            .keyboardShortcut(.init("1"), modifiers: .command) // Dashboard
            .keyboardShortcut(.init("2"), modifiers: .command) // Calendar
            .keyboardShortcut(.init("3"), modifiers: .command) // Clients
            .keyboardShortcut(.init("4"), modifiers: .command) // Products
            .keyboardShortcut(.init("5"), modifiers: .command) // Inventory
            .keyboardShortcut(.init(","), modifiers: .command) // Settings
            .keyboardShortcut(.init("r"), modifiers: .command) // Refresh
    }
}

// MARK: - App Commands

struct SolennixCommands: Commands {

    @Environment(\.openURL) private var openURL

    var body: some Commands {
        // File menu
        CommandGroup(replacing: .newItem) {
            Button("Nuevo Evento") {
                NotificationCenter.default.post(name: .keyboardNewEvent, object: nil)
            }
            .keyboardShortcut("n", modifiers: .command)

            Button("Nuevo Cliente") {
                NotificationCenter.default.post(name: .keyboardNewClient, object: nil)
            }
            .keyboardShortcut("n", modifiers: [.command, .shift])

            Button("Nuevo Producto") {
                NotificationCenter.default.post(name: .keyboardNewProduct, object: nil)
            }
            .keyboardShortcut("n", modifiers: [.command, .option])
        }

        // View menu
        CommandGroup(after: .toolbar) {
            Divider()

            Button("Ir a Dashboard") {
                NotificationCenter.default.post(name: .keyboardGoToDashboard, object: nil)
            }
            .keyboardShortcut("1", modifiers: .command)

            Button("Ir a Calendario") {
                NotificationCenter.default.post(name: .keyboardGoToCalendar, object: nil)
            }
            .keyboardShortcut("2", modifiers: .command)

            Button("Ir a Clientes") {
                NotificationCenter.default.post(name: .keyboardGoToClients, object: nil)
            }
            .keyboardShortcut("3", modifiers: .command)

            Button("Ir a Productos") {
                NotificationCenter.default.post(name: .keyboardGoToProducts, object: nil)
            }
            .keyboardShortcut("4", modifiers: .command)

            Button("Ir a Inventario") {
                NotificationCenter.default.post(name: .keyboardGoToInventory, object: nil)
            }
            .keyboardShortcut("5", modifiers: .command)

            Divider()

            Button("Buscar") {
                NotificationCenter.default.post(name: .keyboardSearch, object: nil)
            }
            .keyboardShortcut("f", modifiers: .command)

            Button("Actualizar") {
                NotificationCenter.default.post(name: .keyboardRefresh, object: nil)
            }
            .keyboardShortcut("r", modifiers: .command)
        }

        // Settings
        CommandGroup(replacing: .appSettings) {
            Button("Ajustes...") {
                NotificationCenter.default.post(name: .keyboardGoToSettings, object: nil)
            }
            .keyboardShortcut(",", modifiers: .command)
        }

        // Help menu
        CommandGroup(replacing: .help) {
            Button("Ayuda de Solennix") {
                if let url = URL(string: "https://solennix.com/help") {
                    openURL(url)
                }
            }

            Button("Reportar un problema") {
                if let url = URL(string: "mailto:soporte@solennix.com") {
                    openURL(url)
                }
            }
        }
    }
}

// MARK: - Keyboard Notification Names

extension Notification.Name {
    static let keyboardNewEvent = Notification.Name("keyboardNewEvent")
    static let keyboardNewClient = Notification.Name("keyboardNewClient")
    static let keyboardNewProduct = Notification.Name("keyboardNewProduct")
    static let keyboardGoToDashboard = Notification.Name("keyboardGoToDashboard")
    static let keyboardGoToCalendar = Notification.Name("keyboardGoToCalendar")
    static let keyboardGoToClients = Notification.Name("keyboardGoToClients")
    static let keyboardGoToProducts = Notification.Name("keyboardGoToProducts")
    static let keyboardGoToInventory = Notification.Name("keyboardGoToInventory")
    static let keyboardGoToSettings = Notification.Name("keyboardGoToSettings")
    static let keyboardSearch = Notification.Name("keyboardSearch")
    static let keyboardRefresh = Notification.Name("keyboardRefresh")
}

// MARK: - Keyboard Shortcut Handler

@MainActor
final class KeyboardShortcutHandler: ObservableObject {

    static let shared = KeyboardShortcutHandler()

    private init() {
        setupObservers()
    }

    private func setupObservers() {
        // These would be connected to the actual navigation logic
        NotificationCenter.default.addObserver(
            forName: .keyboardNewEvent,
            object: nil,
            queue: .main
        ) { _ in
            // Handle new event
        }

        NotificationCenter.default.addObserver(
            forName: .keyboardSearch,
            object: nil,
            queue: .main
        ) { _ in
            // Handle search
        }

        // Add more observers as needed
    }
}

// MARK: - Focus State for Keyboard Navigation

enum AppFocusState: Hashable {
    case sidebar
    case content
    case detail
    case search
}

// MARK: - Keyboard Shortcuts View Extension

extension View {
    func withKeyboardShortcuts(
        onNewEvent: @escaping () -> Void = {},
        onSearch: @escaping () -> Void = {},
        onRefresh: @escaping () -> Void = {}
    ) -> some View {
        self
            .onReceive(NotificationCenter.default.publisher(for: .keyboardNewEvent)) { _ in
                onNewEvent()
            }
            .onReceive(NotificationCenter.default.publisher(for: .keyboardSearch)) { _ in
                onSearch()
            }
            .onReceive(NotificationCenter.default.publisher(for: .keyboardRefresh)) { _ in
                onRefresh()
            }
    }
}

// MARK: - Keyboard Shortcuts Help View

struct KeyboardShortcutsHelpView: View {
    var body: some View {
        List {
            Section("Navegacion") {
                shortcutRow(key: "⌘1", description: "Dashboard")
                shortcutRow(key: "⌘2", description: "Calendario")
                shortcutRow(key: "⌘3", description: "Clientes")
                shortcutRow(key: "⌘4", description: "Productos")
                shortcutRow(key: "⌘5", description: "Inventario")
                shortcutRow(key: "⌘,", description: "Ajustes")
            }

            Section("Acciones") {
                shortcutRow(key: "⌘N", description: "Nuevo evento")
                shortcutRow(key: "⌘⇧N", description: "Nuevo cliente")
                shortcutRow(key: "⌘⌥N", description: "Nuevo producto")
                shortcutRow(key: "⌘F", description: "Buscar")
                shortcutRow(key: "⌘R", description: "Actualizar")
            }

            Section("General") {
                shortcutRow(key: "⌘W", description: "Cerrar ventana")
                shortcutRow(key: "⌘Q", description: "Salir")
                shortcutRow(key: "⌘?", description: "Ayuda")
            }
        }
        .navigationTitle("Atajos de Teclado")
    }

    private func shortcutRow(key: String, description: String) -> some View {
        HStack {
            Text(description)
            Spacer()
            Text(key)
                .font(.system(.body, design: .monospaced))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color(.systemGray5))
                .clipShape(RoundedRectangle(cornerRadius: 4))
        }
    }
}

// MARK: - Preview

#Preview("Keyboard Shortcuts Help") {
    NavigationStack {
        KeyboardShortcutsHelpView()
    }
}
