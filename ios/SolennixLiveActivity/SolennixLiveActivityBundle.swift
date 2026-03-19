import SwiftUI
import WidgetKit

// MARK: - Live Activity Widget Bundle

/// Punto de entrada del widget bundle para la Live Activity de Solennix.
///
/// Este bundle agrupa todos los widgets de la extensión. Actualmente solo
/// contiene la Live Activity para seguimiento de eventos en tiempo real.
@main
struct SolennixLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        SolennixLiveActivity()
    }
}
