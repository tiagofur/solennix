import Foundation

// MARK: - Onboarding Strings

enum OnboardingStrings {
    // MARK: - Navigation Actions
    static var actionSkip: String { FeatureL10n.text("onboarding.action.skip", "Omitir") }
    static var actionNext: String { FeatureL10n.text("onboarding.action.next", "Siguiente") }
    static var actionStart: String { FeatureL10n.text("onboarding.action.start", "Comenzar") }

    // MARK: - Page 0: Welcome
    static var welcomeTitle: String { FeatureL10n.text("onboarding.welcome.title", "Bienvenido a Solennix") }
    static var welcomeDescription: String { FeatureL10n.text("onboarding.welcome.description", "La herramienta definitiva para organizar tus eventos de manera profesional") }

    // MARK: - Page 1: Core Features
    static var coreFeaturesTitle: String { FeatureL10n.text("onboarding.core_features.title", "Todo en un Solo Lugar") }
    static var coreFeaturesItem1: String { FeatureL10n.text("onboarding.core_features.item1", "Gestiona clientes y contactos") }
    static var coreFeaturesItem2: String { FeatureL10n.text("onboarding.core_features.item2", "Crea cotizaciones y contratos") }
    static var coreFeaturesItem3: String { FeatureL10n.text("onboarding.core_features.item3", "Controla tu inventario") }
    static var coreFeaturesItem4: String { FeatureL10n.text("onboarding.core_features.item4", "Programa eventos en calendario") }

    // MARK: - Page 2: Apple Features
    static var appleFeaturesTitle: String { FeatureL10n.text("onboarding.apple_features.title", "Diseñado para Apple") }
    static var appleFeaturesItem1: String { FeatureL10n.text("onboarding.apple_features.item1", "Widgets en tu pantalla de inicio") }
    static var appleFeaturesItem2: String { FeatureL10n.text("onboarding.apple_features.item2", "Comandos de Siri") }
    static var appleFeaturesItem3: String { FeatureL10n.text("onboarding.apple_features.item3", "Búsqueda desde Spotlight") }
    static var appleFeaturesItem4: String { FeatureL10n.text("onboarding.apple_features.item4", "Actividades en Vivo el día del evento") }
    static var appleFeaturesItem5: String { FeatureL10n.text("onboarding.apple_features.item5", "Face ID y Touch ID") }

    // MARK: - Page 3: Get Started
    static var getStartedTitle: String { FeatureL10n.text("onboarding.get_started.title", "Comienza Ahora") }
    static var getStartedDescription: String { FeatureL10n.text("onboarding.get_started.description", "Crea tu cuenta o inicia sesión para empezar") }

    // MARK: - iPad Brand Panel (shared with Login but grouped here)
    static var brandSubtitle: String { FeatureL10n.text("onboarding.brand.subtitle", "Cada detalle importa") }
    static var brandFeatureEvents: String { FeatureL10n.text("onboarding.brand.feature_events", "Gestiona eventos de principio a fin") }
    static var brandFeatureClients: String { FeatureL10n.text("onboarding.brand.feature_clients", "CRM integrado para tus clientes") }
    static var brandFeatureReports: String { FeatureL10n.text("onboarding.brand.feature_reports", "Reportes financieros en tiempo real") }
}
