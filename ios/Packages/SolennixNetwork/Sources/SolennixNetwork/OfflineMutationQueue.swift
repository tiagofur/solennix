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

    func enqueue(_ mutation: QueuedMutation) {
        var current = load()
        current.append(mutation)
        save(current)
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

    private func load() -> [QueuedMutation] {
        guard let data = userDefaults.data(forKey: storageKey) else { return [] }
        return (try? decoder.decode([QueuedMutation].self, from: data)) ?? []
    }

    private func save(_ items: [QueuedMutation]) {
        guard let data = try? encoder.encode(items) else { return }
        userDefaults.set(data, forKey: storageKey)
    }
}
