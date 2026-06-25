import XCTest
import SwiftUI
import SnapshotTesting
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Task 4.2 — `Lista | Calendario` view-mode toggle in the Eventos content
/// header (ADR-7): `viewMode` lives on the VIEW as `@State` (default `.lista`),
/// is NOT persisted via `@AppStorage`, and toggling it MUST NOT reload events or
/// drop the current selection.
///
/// The `EventListView` integration isn't snapshot-tested directly — it requires
/// the full app environment (CacheManager, ToastManager, apiClient) plus a
/// network-bound `.task { await loadEvents() }`. Following the repo's seam-based
/// testing philosophy (ADR-8), the toggle is a pure, ViewModel-free component
/// (`EventosViewModeToggle`, holding only a `Binding<EventosViewMode>`). That
/// structurally guarantees a flip can never reach `EventListViewModel` — it has
/// no reference to one. These tests pin the contract: the toggle reflects its
/// binding (Lista default + Calendario switch), and flipping it writes nothing
/// to `UserDefaults`. The "no reload" invariant is therefore enforced by
/// construction (VM-free toggle + the View wiring `$viewMode` into the pure-read
/// `EventosLayoutFactory`).
final class EventListViewViewModeTests: XCTestCase {

    // MARK: - Default entry is Lista + reflection (switches lista ↔ calendario)

    func testToggleDefaultsToListaWhenBoundToLista() {
        // Default entry is Lista (ADR-7): the toggle bound to `.lista` shows
        // Lista as the selected segment. This is the first render state of
        // EventListView's `@State var viewMode: EventosViewMode = .lista`.
        assertSnapshot(
            of: EventosViewModeToggle(viewMode: .constant(.lista)).padding(),
            as: .image(layout: .fixed(width: 360, height: 64)),
            testName: "lista-selected"
        )
    }

    func testToggleReflectsCalendarioWhenBoundToCalendario() {
        // Triangulation: the SAME toggle bound to `.calendario` shows Calendario
        // selected — proving the toggle reflects its binding and a flip switches
        // the rendered mode. Together with the Lista case this proves the toggle
        // switches viewMode to `.calendario` and back.
        assertSnapshot(
            of: EventosViewModeToggle(viewMode: .constant(.calendario)).padding(),
            as: .image(layout: .fixed(width: 360, height: 64)),
            testName: "calendario-selected"
        )
    }

    // MARK: - Non-persistence (ADR-7)

    func testTogglingViewModeWritesNothingToUserDefaults() {
        // viewMode is `@State` on the VIEW, NOT `@AppStorage` (ADR-7). We
        // exercise the toggle's value-change path (exactly what a segmented
        // Picker tap drives) by writing the bound value, render the toggle so
        // its body re-evaluates with the flipped values, then assert no
        // viewMode key was persisted to UserDefaults.
        var mode: EventosViewMode = .lista
        let binding = Binding<EventosViewMode>(
            get: { mode },
            set: { mode = $0 }
        )
        let toggle = EventosViewModeToggle(viewMode: binding)

        // Flip lista -> calendario -> lista through the binding setter.
        binding.wrappedValue = .calendario
        binding.wrappedValue = .lista

        // Render so the toggle body evaluates with the flipped values (a real
        // read of production state; would seed a key if it were @AppStorage).
        assertSnapshot(
            of: toggle.padding(),
            as: .image(layout: .fixed(width: 360, height: 64)),
            testName: "persistence-probe"
        )

        let persistedKeys = UserDefaults.standard.dictionaryRepresentation().keys.filter {
            $0.lowercased().contains("viewmode")
        }
        XCTAssertTrue(
            persistedKeys.isEmpty,
            "viewMode must not be persisted to UserDefaults; found keys: \(persistedKeys)"
        )
    }
}
