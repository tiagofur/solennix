import Foundation

struct QueuedMutation: Codable, Sendable {
    let id: String
    let endpoint: String
    let method: String
    let bodyBase64: String?
    let idempotencyKey: String
    let createdAt: Date
}

actor OfflineMutationQueue {
    private let storageKey = "solennix.offlineMutationQueue"
    private let userDefaults: UserDefaults
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
    }

    /// Enqueues a mutation. For PUT/PATCH/DELETE, coalesces by (method, endpoint)
    /// so a newer body replaces any older queued full-state write to the same path
    /// (prevents stale offline A clobbering a later online B after flush).
    func enqueue(_ mutation: QueuedMutation) {
        var current = load()
        if Self.shouldCoalesce(method: mutation.method) {
            current.removeAll {
                $0.method == mutation.method && $0.endpoint == mutation.endpoint
            }
        }
        current.append(mutation)
        save(current)
    }

    /// Drops any queued mutations matching (method, endpoint).
    /// Call after a successful live PUT/PATCH/DELETE so a later flush cannot
    /// replay a stale offline body over fresher server state.
    func removeMatching(method: String, endpoint: String) {
        var current = load()
        let before = current.count
        current.removeAll { $0.method == method && $0.endpoint == endpoint }
        if current.count != before {
            save(current)
        }
    }

    func dequeueAll() -> [QueuedMutation] {
        let current = load()
        save([])
        return current
    }

    /// Returns all pending mutations without removing them from storage.
    /// Use this in the flush path to allow crash-safe incremental removal.
    func peekAll() -> [QueuedMutation] {
        load()
    }

    func replace(with items: [QueuedMutation]) {
        save(items)
    }

    /// Idempotent full/partial replace and delete — safe to keep only latest body.
    /// POST creates are not coalesced (multiple creates to the same path are distinct).
    static func shouldCoalesce(method: String) -> Bool {
        method == "PUT" || method == "PATCH" || method == "DELETE"
    }

    private func load() -> [QueuedMutation] {
        guard let data = userDefaults.data(forKey: storageKey) else { return [] }
        return (try? decoder.decode([QueuedMutation].self, from: data)) ?? []
    }

    private func save(_ items: [QueuedMutation]) {
        guard let data = try? encoder.encode(items) else { return }
        userDefaults.set(data, forKey: storageKey)
    }
}
