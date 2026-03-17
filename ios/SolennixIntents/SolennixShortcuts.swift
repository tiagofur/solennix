import AppIntents

// MARK: - Solennix Shortcuts Provider

/// Provides the app's shortcuts to the system
struct SolennixShortcutsProvider: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ShowUpcomingEventsIntent(),
            phrases: [
                "Mostrar mis proximos eventos en \(.applicationName)",
                "Que eventos tengo en \(.applicationName)",
                "Proximos eventos de \(.applicationName)"
            ],
            shortTitle: "Proximos Eventos",
            systemImageName: "calendar"
        )

        AppShortcut(
            intent: EventCountIntent(),
            phrases: [
                "Cuantos eventos tengo esta semana en \(.applicationName)",
                "Eventos de la semana en \(.applicationName)",
                "Conteo de eventos en \(.applicationName)"
            ],
            shortTitle: "Conteo de Eventos",
            systemImageName: "number"
        )

        AppShortcut(
            intent: ShowTodayEventsIntent(),
            phrases: [
                "Que eventos tengo hoy en \(.applicationName)",
                "Eventos de hoy en \(.applicationName)",
                "Mi agenda de hoy en \(.applicationName)"
            ],
            shortTitle: "Eventos de Hoy",
            systemImageName: "sun.max"
        )

        AppShortcut(
            intent: ShowMonthlyRevenueIntent(),
            phrases: [
                "Cuanto he ganado este mes en \(.applicationName)",
                "Ingresos del mes en \(.applicationName)",
                "Revenue de \(.applicationName)"
            ],
            shortTitle: "Ingresos del Mes",
            systemImageName: "dollarsign.circle"
        )

        AppShortcut(
            intent: CheckLowStockIntent(),
            phrases: [
                "Revisar inventario bajo en \(.applicationName)",
                "Stock bajo en \(.applicationName)",
                "Alertas de inventario en \(.applicationName)"
            ],
            shortTitle: "Stock Bajo",
            systemImageName: "exclamationmark.triangle"
        )
    }
}
