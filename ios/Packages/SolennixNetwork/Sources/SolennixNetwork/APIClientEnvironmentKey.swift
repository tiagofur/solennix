import SwiftUI

// MARK: - APIClient Environment Key

private struct APIClientKey: EnvironmentKey {
    static let defaultValue: APIClient = APIClient()
}

public extension EnvironmentValues {
    var apiClient: APIClient {
        get { self[APIClientKey.self] }
        set { self[APIClientKey.self] = newValue }
    }
}
