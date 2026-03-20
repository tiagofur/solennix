import Foundation
import Network
import Observation

/// Monitors network connectivity status using `NWPathMonitor`.
///
/// Inject via `@Environment` and observe `isConnected` to show
/// offline banners or disable network-dependent actions.
@Observable
public final class NetworkMonitor {

    // MARK: - Properties

    /// Whether the device currently has network connectivity.
    public private(set) var isConnected: Bool = true

    /// The current connection type, if connected.
    public private(set) var connectionType: NWInterface.InterfaceType?

    private let monitor: NWPathMonitor
    private let queue: DispatchQueue

    // MARK: - Init

    public init() {
        self.monitor = NWPathMonitor()
        self.queue = DispatchQueue(label: "com.solennix.app.networkMonitor", qos: .utility)

        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
                self?.connectionType = Self.resolveConnectionType(path)
            }
        }

        monitor.start(queue: queue)
    }

    deinit {
        monitor.cancel()
    }

    // MARK: - Helpers

    private static func resolveConnectionType(_ path: NWPath) -> NWInterface.InterfaceType? {
        if path.usesInterfaceType(.wifi) { return .wifi }
        if path.usesInterfaceType(.cellular) { return .cellular }
        if path.usesInterfaceType(.wiredEthernet) { return .wiredEthernet }
        return nil
    }
}
