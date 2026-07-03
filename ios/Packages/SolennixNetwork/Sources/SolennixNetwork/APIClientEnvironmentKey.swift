// SwiftUI is imported here only for `EnvironmentKey`/`EnvironmentValues` — the
// standard SwiftUI DI surface used to inject `APIClient` via `@Environment`.
// This is a deliberate, thin framework frontier (DI wiring), NOT UI logic
// leaking into the network layer. Kept in SolennixNetwork so the same module
// that owns `APIClient` also owns its DI integration. (#757)
import SwiftUI

// MARK: - APIClient Environment Key

private struct APIClientKey: EnvironmentKey {
    static let defaultValue: APIClient = APIClient(baseURL: URL(string: "https://api.solennix.com/api")!)
}

public extension EnvironmentValues {
    var apiClient: APIClient {
        get { self[APIClientKey.self] }
        set { self[APIClientKey.self] = newValue }
    }
}
